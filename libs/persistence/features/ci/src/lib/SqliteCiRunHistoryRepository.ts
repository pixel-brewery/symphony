// #region Imports

import type { ICiRunHistoryQuery, ICiRunHistoryRepository } from '@symphony/application-ci';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type { ICiRun, ICiRunHistory } from '@symphony/domain-ci';
import { ciRunHistorySchema } from './CiRunHistorySchema';

// #endregion

interface IRunRow {
  readonly payload: string;
  readonly started_at: string;
}

/**
 * Persists finished workflow runs by run id and attempt through a shared database owner.
 *
 * @public
 */
export class SqliteCiRunHistoryRepository implements ICiRunHistoryRepository {
  // #region Ctor

  /**
   * Uses the database connection supplied by composition.
   *
   * @param _database - Shared SQLite connection and transaction owner.
   * @public
   */
  public constructor(private readonly _database: SqliteDatabase) {}

  // #endregion

  // #region Methods

  /**
   * Applies this feature's idempotent schema for independent adapter use.
   *
   * @public
   */
  public initialize(): void {
    this._database.connection.exec(ciRunHistorySchema);
  }

  /**
   * Inserts or replaces the runs by run id and attempt and removes runs that started before the
   * retention bound, in one transaction.
   *
   * @param runs - Finished runs with a start instant.
   * @param retainSince - Runs that started earlier are removed (ISO).
   * @public
   */
  public recordRuns(runs: readonly ICiRun[], retainSince: string): void {
    const connection = this._database.connection;
    this._database.immediateTransaction(() => {
      const upsert = connection.prepare(
        `INSERT INTO ci_run_history(
           run_id, run_attempt, workspace_id, repository_binding_id, started_at, payload
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(run_id, run_attempt) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           repository_binding_id = excluded.repository_binding_id,
           started_at = excluded.started_at,
           payload = excluded.payload`,
      );
      for (const run of runs) {
        const startedAt = run.startedAt ?? run.finishedAt;
        if (!startedAt) continue;
        upsert.run(
          run.id,
          run.runAttempt ?? 1,
          run.workspaceId,
          run.repositoryBindingId,
          startedAt,
          JSON.stringify(run),
        );
      }
      connection.prepare('DELETE FROM ci_run_history WHERE started_at < ?').run(retainSince);
    });
  }

  /**
   * Lists the recorded runs of the scope that started at or after `since`, newest first.
   *
   * @param query - Scope, lower bound and maximum.
   * @returns The runs and the instant from which they are complete.
   * @public
   */
  public listRunHistory(query: ICiRunHistoryQuery): ICiRunHistory {
    const scope = JSON.stringify(query.workspaceIds);
    const rows = this._database.connection
      .prepare(
        `SELECT payload, started_at FROM ci_run_history
         WHERE workspace_id IN (SELECT value FROM json_each(?)) AND started_at >= ?
         ORDER BY started_at DESC, run_id DESC, run_attempt DESC
         LIMIT ?`,
      )
      .all(scope, query.since, query.limit + 1) as unknown as IRunRow[];
    const truncated = rows.length > query.limit;
    const kept = rows.slice(0, query.limit);
    const earliest = this._database.connection
      .prepare(
        `SELECT MIN(started_at) AS value FROM ci_run_history
         WHERE workspace_id IN (SELECT value FROM json_each(?))`,
      )
      .get(scope) as { value: string | null } | undefined;
    const recordedSince = truncated ? kept.at(-1)?.started_at : (earliest?.value ?? undefined);
    return {
      runs: kept.map((row) => JSON.parse(row.payload) as ICiRun),
      ...(recordedSince ? { recordedSince } : {}),
      truncated,
    };
  }

  // #endregion
}
