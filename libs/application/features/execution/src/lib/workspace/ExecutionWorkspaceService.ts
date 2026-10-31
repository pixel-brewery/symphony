// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkspaceCleanupResult } from '@symphony/domain-workspace';
import type { IPreparedWorkspace } from '@symphony/application-workspace';
import type { IExecutionWorkspaces } from './IExecutionWorkspaces';
import type { IExecutionWorkspacesDependencies } from './IExecutionWorkspacesDependencies';

// #endregion

/** Applies execution workspace retention and cleanup policy. @public */
export class ExecutionWorkspaceService implements IExecutionWorkspaces {
  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionWorkspacesDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Clears the workspaces.
   *
   * @public
   */
  public async clearWorkspaces(): Promise<IWorkspaceCleanupResult> {
    const executions = this._dependencies.repository.listExecutions();
    const paths = new Map<string, readonly IExecutionRecord[]>();
    for (const execution of executions) {
      if (!execution.workspacePath) continue;
      paths.set(execution.workspacePath, [
        ...(paths.get(execution.workspacePath) ?? []),
        execution,
      ]);
    }
    for (const path of await this._dependencies.workspace.listManaged()) {
      if (!paths.has(path)) paths.set(path, []);
    }

    const result: IWorkspaceCleanupResult = { removed: 0, missing: 0, skipped: 0, failed: 0 };
    for (const [path, owners] of paths) {
      if (owners.some((execution) => this._dependencies.isActive(execution.state))) {
        result.skipped += 1;
        continue;
      }
      try {
        if (await this._dependencies.workspace.release(path)) result.removed += 1;
        else result.missing += 1;
      } catch {
        result.failed += 1;
      }
    }
    return result;
  }

  /**
   * Clears the workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public async clearWorkspace(workspaceId: string): Promise<IWorkspaceCleanupResult> {
    const executions = this._dependencies.repository
      .listExecutions()
      .filter((execution) => execution.workspaceId === workspaceId);
    if (executions.some((execution) => this._dependencies.isActive(execution.state))) {
      throw new Error('Wait for or cancel active workspace executions before deleting it.');
    }

    const paths = new Set(
      executions.flatMap((execution) => (execution.workspacePath ? [execution.workspacePath] : [])),
    );
    for (const path of await this._dependencies.workspace.listManaged(workspaceId)) paths.add(path);

    const result: IWorkspaceCleanupResult = { removed: 0, missing: 0, skipped: 0, failed: 0 };
    for (const path of paths) {
      try {
        if (await this._dependencies.workspace.release(path)) result.removed += 1;
        else result.missing += 1;
      } catch {
        result.failed += 1;
      }
    }
    return result;
  }

  /**
   * Returns the cleanup eligible workspaces.
   *
   * @public
   */
  public async cleanupEligibleWorkspaces(): Promise<void> {
    const released = new Set<string>();
    for (const execution of this._dependencies.repository.listExecutions()) {
      if (
        !execution.workspacePath ||
        released.has(execution.workspacePath) ||
        !this.shouldReleaseAutomatically(execution)
      ) {
        continue;
      }
      released.add(execution.workspacePath);
      try {
        await this._dependencies.workspace.release(execution.workspacePath);
      } catch {
        // Workspace cleanup is best-effort and never changes a completed execution result.
      }
    }
  }

  /**
   * Releases inactive analysis workspaces when delivery capacity needs to be reclaimed.
   *
   * Failed implementation and revision workspaces may contain the only recoverable source
   * changes and are never selected here. Analysis is read-only with respect to target source,
   * while its durable summary and diagnostics remain in persistence after the worktree is gone.
   *
   * @public
   */
  public async cleanupReclaimableAnalysisWorkspaces(): Promise<number> {
    const executions = this._dependencies.repository.listExecutions();
    const paths = new Set(
      executions.flatMap((execution) => (execution.workspacePath ? [execution.workspacePath] : [])),
    );
    let removed = 0;
    for (const path of paths) {
      const owners = executions.filter((execution) => execution.workspacePath === path);
      if (
        owners.some(
          (execution) =>
            this._dependencies.isActive(execution.state) ||
            execution.preserveWorkspace ||
            execution.kind === 'solution' ||
            execution.kind === 'revision',
        ) ||
        !owners.some(
          (execution) =>
            (execution.kind === undefined || execution.kind === 'analysis') &&
            (execution.state === 'failed' || execution.state === 'cancelled'),
        )
      ) {
        continue;
      }
      try {
        if (await this._dependencies.workspace.release(path)) removed += 1;
      } catch {
        // Reclamation is best-effort; admission remains closed until the reserve is real.
      }
    }
    return removed;
  }

  /** Applies retention policy without replacing the execution outcome. @public */
  public async finalizeWorkspace(
    execution: IExecutionRecord,
  ): Promise<'released' | 'preserved' | 'unconfirmed' | 'none'> {
    if (!execution.workspacePath) return 'none';
    try {
      if (this.shouldReleaseAutomatically(execution)) {
        await this._dependencies.workspace.release(execution.workspacePath);
        return 'released';
      } else {
        await this._dependencies.workspace.preserve(execution.workspacePath);
        return 'preserved';
      }
    } catch {
      // Workspace lifecycle failures never replace the execution's actual terminal result.
      return 'unconfirmed';
    }
  }

  private shouldReleaseAutomatically(execution: IExecutionRecord): boolean {
    if (execution.preserveWorkspace) return false;
    if (execution.state === 'succeeded') {
      return execution.kind === undefined || execution.kind === 'analysis';
    }
    return (
      (execution.state === 'failed' || execution.state === 'cancelled') &&
      !this._dependencies.retainFailedWorkspaces()
    );
  }

  /** Requires the preserved worktree needed to continue an implementation. @public */
  /**
   * The failed implementation whose worktree is still on disk, if there is one.
   *
   * Rebuilding from the default branch throws away work the scope contract already accepted and
   * leaves one abandoned branch per attempt, so a retry continues what is there. Only once the
   * worktree is gone - retention switched off, or removed by hand - is there nothing to continue
   * and a clean start is the honest answer.
   */
  public async retainedImplementationWorkspace(
    executions: readonly IExecutionRecord[],
  ): Promise<{ execution: IExecutionRecord; workspace: IPreparedWorkspace } | undefined> {
    const latest = [...executions]
      .filter((execution) => execution.kind === 'solution' || execution.kind === 'revision')
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .at(-1);
    if (latest?.state !== 'failed' || !latest.workspacePath || !latest.workspaceReference) {
      return undefined;
    }
    if (!(await this._dependencies.workspace.isAvailable(latest.workspacePath))) return undefined;
    return {
      execution: latest,
      workspace: { path: latest.workspacePath, reference: latest.workspaceReference },
    };
  }

  // #endregion
}
