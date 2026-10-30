// #region Imports

import type { IVerificationWorkspacePort } from '@symphony/application-ci';
import type { IWorkspacePort } from '@symphony/application-workspace';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IWorkItem } from '@symphony/domain-work';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// #endregion

export class SimulatedWorkspace implements IWorkspacePort, IVerificationWorkspacePort {
  // #region Ctor

  public constructor(
    private readonly _workspaceRoot: (workspaceId?: string) => string = () => '/managed-workspaces',
    private readonly _workspaceIds: () => readonly string[] = () => [],
  ) {}

  // #endregion

  // #region Methods

  /**
   * Prepares.
   *
   * @param executionId - Execution id.
   * @param workItem - Work item.
   * @param purpose - Purpose.
   * @public
   */
  public async prepare(
    executionId: string,
    workItem: IWorkItem,
    purpose: 'analysis' | 'implementation',
  ): Promise<{ readonly path: string; readonly reference?: string }> {
    await delay(120);
    const workspaceRoot = this._workspaceRoot(workItem.workspaceId);
    mkdirSync(workspaceRoot, { recursive: true, mode: 0o700 });
    const workspacePath = join(workspaceRoot, executionId);
    mkdirSync(workspacePath, { recursive: false, mode: 0o700 });
    const issueNumber = workItem.externalId.replace(/^#/u, '') || 'work';
    return {
      path: workspacePath,
      ...(purpose === 'implementation'
        ? { reference: `codex/work-${issueNumber}-simulated-implementation` }
        : {}),
    };
  }

  /**
   * Returns the preserve.
   *
   * @public
   */
  public async preserve(): Promise<void> {
    await delay(40);
  }

  /**
   * Prepares the verification.
   *
   * @param executionId - Execution id.
   * @param repository - Repository.
   * @param revision - Revision.
   * @public
   */
  public async prepareVerification(
    executionId: string,
    repository: IRepositoryBinding,
    revision: string,
  ): Promise<string> {
    void revision;
    const workspaceRoot = this._workspaceRoot(repository.workspaceId);
    mkdirSync(workspaceRoot, { recursive: true, mode: 0o700 });
    const workspacePath = join(workspaceRoot, `execution-${executionId}`);
    mkdirSync(workspacePath, { recursive: false, mode: 0o700 });
    return workspacePath;
  }

  /**
   * Whether it is available.
   *
   * @param path - Path.
   * @public
   */
  public async isAvailable(path: string): Promise<boolean> {
    return existsSync(path);
  }

  /**
   * Inspects the changes.
   *
   * @public
   */
  public async inspectChanges(): Promise<{
    readonly changedFiles: readonly string[];
    readonly diffLines: number;
  }> {
    return { changedFiles: ['src/simulated-change.ts'], diffLines: 12 };
  }

  /**
   * Lists the managed.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public async listManaged(workspaceId?: string): Promise<readonly string[]> {
    return this.managedRoots(workspaceId).flatMap((workspaceRoot) => {
      if (!existsSync(workspaceRoot)) return [];
      return readdirSync(workspaceRoot, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            !entry.isSymbolicLink() &&
            /^execution-[a-zA-Z0-9._-]+$/.test(entry.name),
        )
        .map((entry) => join(workspaceRoot, entry.name));
    });
  }

  /**
   * Releases.
   *
   * @param path - Path.
   * @public
   */
  public async release(path: string): Promise<boolean> {
    const workspacePath = resolve(path);
    if (!this.managedRoots().some((root) => dirname(workspacePath) === root)) {
      throw new Error('Refusing to remove a path outside the managed workspace roots.');
    }
    if (!existsSync(workspacePath)) return false;
    rmSync(workspacePath, { recursive: true, force: true });
    return true;
  }

  private managedRoots(workspaceId?: string): readonly string[] {
    if (workspaceId) return [resolve(this._workspaceRoot(workspaceId))];
    const workspaceIds = this._workspaceIds();
    return workspaceIds.length
      ? workspaceIds.map((workspaceId) => resolve(this._workspaceRoot(workspaceId)))
      : [resolve(this._workspaceRoot())];
  }

  // #endregion
}
