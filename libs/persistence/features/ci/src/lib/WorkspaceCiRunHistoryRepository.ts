// #region Imports

import type { ICiRunHistoryQuery, ICiRunHistoryRepository } from '@symphony/application-ci';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import type { ICiRun, ICiRunHistory } from '@symphony/domain-ci';
import { SqliteCiRunHistoryRepository } from './SqliteCiRunHistoryRepository';

// #endregion

/**
 * Routes the workflow-run history through each run's own workspace database.
 *
 * @public
 */
export class WorkspaceCiRunHistoryRepository implements ICiRunHistoryRepository {
  // #region Ctor

  /**
   * Binds shared workspace storage.
   *
   * @param _registry - Configured workspace paths and connection lifecycle.
   * @public
   */
  public constructor(private readonly _registry: WorkspaceDatabaseRegistry) {}

  // #endregion

  // #region Methods

  /**
   * Records each run in its workspace database; runs of a workspace that is no longer
   * configured are dropped rather than opening storage for it.
   *
   * @param runs - Finished runs with a start instant.
   * @param retainSince - Runs that started earlier are removed (ISO).
   * @public
   */
  public recordRuns(runs: readonly ICiRun[], retainSince: string): void {
    const configured = new Set(this._registry.workspaceIds());
    const byWorkspace = new Map<string, ICiRun[]>();
    for (const run of runs) {
      if (!configured.has(run.workspaceId)) continue;
      const workspaceRuns = byWorkspace.get(run.workspaceId);
      if (workspaceRuns) workspaceRuns.push(run);
      else byWorkspace.set(run.workspaceId, [run]);
    }
    for (const [workspaceId, workspaceRuns] of byWorkspace) {
      this.repositoryFor(workspaceId).recordRuns(workspaceRuns, retainSince);
    }
  }

  /**
   * Lists the recorded runs of the configured workspaces of the scope, newest first and at most
   * `limit` of them.
   *
   * @param query - Scope, lower bound and maximum.
   * @returns The runs and the instant from which they are complete.
   * @public
   */
  public listRunHistory(query: ICiRunHistoryQuery): ICiRunHistory {
    const configured = new Set(this._registry.workspaceIds());
    const sources = query.workspaceIds
      .filter((workspaceId) => configured.has(workspaceId))
      .map((workspaceId) =>
        this.repositoryFor(workspaceId).listRunHistory({ ...query, workspaceIds: [workspaceId] }),
      );
    const merged = sources
      .flatMap((source) => source.runs)
      .toSorted((left, right) => runStart(right).localeCompare(runStart(left)));
    const kept = merged.slice(0, query.limit);
    const cut = merged.length > query.limit;
    const truncatedAt = [
      ...sources.flatMap((source) =>
        source.truncated && source.recordedSince ? [source.recordedSince] : [],
      ),
      ...(cut && kept.length ? [runStart(kept.at(-1)!)] : []),
    ].toSorted();
    const earliest = sources
      .flatMap((source) => (source.recordedSince ? [source.recordedSince] : []))
      .toSorted()[0];
    const recordedSince = truncatedAt.length ? truncatedAt.at(-1) : earliest;
    return {
      runs: kept,
      ...(recordedSince ? { recordedSince } : {}),
      truncated: truncatedAt.length > 0,
    };
  }

  private repositoryFor(workspaceId: string): SqliteCiRunHistoryRepository {
    return new SqliteCiRunHistoryRepository(this._registry.databaseFor(workspaceId));
  }

  // #endregion
}

function runStart(run: ICiRun): string {
  return run.startedAt ?? run.finishedAt ?? '';
}
