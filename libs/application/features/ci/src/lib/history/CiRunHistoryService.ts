// #region Imports

import type { ICiRun, ICiRunHistory } from '@symphony/domain-ci';
import type { ICiRunHistoryDependencies } from './ICiRunHistoryDependencies';

// #endregion

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

/**
 * Days a finished run is kept: a quarter and the quarter before it for the comparison, plus
 * slack so the comparison period stays complete while the oldest runs age out.
 */
const RETENTION_DAYS = 200;

/** Most runs one read returns; a busier scope is cut at its oldest runs. */
const MAXIMUM_RUNS = 10_000;

/**
 * Keeps the workflow-run history the provider's newest-runs window cannot: every refresh records
 * the finished runs it saw by run id and attempt, and reporting reads them back per workspace
 * scope and period.
 *
 * @public
 */
export class CiRunHistoryService {
  // #region Ctor

  /**
   * Binds the durable record and the clock.
   *
   * @param _dependencies - Record, clock and failure reporting.
   * @public
   */
  public constructor(private readonly _dependencies: ICiRunHistoryDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Records the finished runs of one provider read and drops runs older than 200 days. Queued
   * and running runs are recorded once a later read sees them finished. A storage failure is
   * reported, never thrown, so the refresh that observed the runs still succeeds.
   *
   * @param runs - Runs one provider read returned.
   * @public
   */
  public record(runs: readonly ICiRun[]): void {
    const finished = runs.filter(
      (run) =>
        run.workspaceId &&
        (run.status === 'succeeded' || run.status === 'failed' || run.status === 'cancelled') &&
        !Number.isNaN(Date.parse(run.startedAt ?? run.finishedAt ?? '')),
    );
    if (!finished.length) return;
    const retainSince = new Date(this.now() - RETENTION_DAYS * DAY_MILLISECONDS).toISOString();
    try {
      this._dependencies.repository.recordRuns(finished, retainSince);
    } catch (cause) {
      this._dependencies.reportRecordFailure?.(cause);
    }
  }

  /**
   * Lists the recorded finished runs of the scope that started since an instant, bounded to the
   * retention window and at most 10,000 runs.
   *
   * @param input - Workspaces of the scope and the earliest instant of interest (ISO).
   * @returns The runs, newest first, and the instant from which they are complete.
   * @public
   */
  public list(input: {
    readonly workspaceIds: readonly string[];
    readonly since: string;
  }): ICiRunHistory {
    const workspaceIds = [...new Set(input.workspaceIds)];
    if (!workspaceIds.length) return { runs: [], truncated: false };
    const now = this.now();
    const requested = Date.parse(input.since);
    const since = Math.min(
      now,
      Math.max(now - RETENTION_DAYS * DAY_MILLISECONDS, Number.isNaN(requested) ? now : requested),
    );
    return this._dependencies.repository.listRunHistory({
      workspaceIds,
      since: new Date(since).toISOString(),
      limit: MAXIMUM_RUNS,
    });
  }

  private now(): number {
    return Date.parse(this._dependencies.clock.now());
  }

  // #endregion
}
