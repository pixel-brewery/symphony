// #region Imports

import type { IWorkflowStageChangeHistory } from '@symphony/domain-workflow';
import type { IWorkflowStageHistoryDependencies } from './IWorkflowStageHistoryDependencies';

// #endregion

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Furthest back a caller may read: two quarters for a quarter-over-quarter comparison, and some slack. */
const MAXIMUM_LOOKBACK_DAYS = 400;

/** Most stage changes one read returns; a busier scope is cut at its oldest changes. */
const MAXIMUM_STAGE_CHANGES = 10_000;

/**
 * Answers the bulk stage-change query reporting needs: when work items reached a stage, for a
 * workspace scope and a bounded period, from the append-only workflow audit.
 *
 * @public
 */
export class WorkflowStageHistoryService {
  // #region Ctor

  /**
   * Binds the audit reader and the clock.
   *
   * @param _dependencies - Audit reader and clock.
   * @public
   */
  public constructor(private readonly _dependencies: IWorkflowStageHistoryDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Lists the recorded stage changes of the scope since an instant, bounded to the last
   * 400 days and at most 10,000 changes.
   *
   * @param input - Workspaces of the scope and the earliest instant of interest (ISO).
   * @returns The changes, newest first, and the instant from which they are complete.
   * @public
   */
  public list(input: {
    readonly workspaceIds: readonly string[];
    readonly since: string;
  }): IWorkflowStageChangeHistory {
    const workspaceIds = [...new Set(input.workspaceIds)];
    if (!workspaceIds.length) return { changes: [], truncated: false };
    const now = Date.parse(this._dependencies.clock.now());
    const requested = Date.parse(input.since);
    const since = Math.min(
      now,
      Math.max(
        now - MAXIMUM_LOOKBACK_DAYS * DAY_MILLISECONDS,
        Number.isNaN(requested) ? now : requested,
      ),
    );
    return this._dependencies.repository.listStageChanges({
      workspaceIds,
      since: new Date(since).toISOString(),
      limit: MAXIMUM_STAGE_CHANGES,
    });
  }

  // #endregion
}
