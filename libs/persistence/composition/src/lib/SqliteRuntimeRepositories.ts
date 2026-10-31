// #region Imports

import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteRepositoryTrustRepository } from '@symphony/persistence-workspace';
import {
  SqliteCiRunHistoryRepository,
  SqliteVerificationRepository,
  SqliteLocalCiExecutionRepository,
} from '@symphony/persistence-ci';
import { runtimeSchemas } from './RuntimeSchemas';

// #endregion

/**
 * Composes distinct trust and CI repositories over the same SQLite connection.
 *
 * @public
 */
export class SqliteRuntimeRepositories {
  // #region Fields

  /**
   * Shared database connection and transaction owner.
   *
   * @public
   * @readonly
   */
  public readonly database: SqliteDatabase;

  /**
   * Machine-local repository trust persistence.
   *
   * @public
   * @readonly
   */
  public readonly trust: SqliteRepositoryTrustRepository;

  /**
   * Verification plan and run persistence.
   *
   * @public
   * @readonly
   */
  public readonly verification: SqliteVerificationRepository;

  /**
   * Bounded local-CI execution evidence.
   *
   * @public
   * @readonly
   */
  public readonly localCi: SqliteLocalCiExecutionRepository;

  /**
   * Finished workflow runs kept beyond the provider's newest-runs window.
   *
   * @public
   * @readonly
   */
  public readonly ciRunHistory: SqliteCiRunHistoryRepository;

  // #endregion

  // #region Ctor

  /**
   * Borrows an existing database owner or opens the configured legacy path once.
   *
   * @param database - Shared connection or existing database path.
   * @public
   */
  public constructor(database: string | SqliteDatabase) {
    this.database = typeof database === 'string' ? new SqliteDatabase(database) : database;
    this.trust = new SqliteRepositoryTrustRepository(this.database);
    this.verification = new SqliteVerificationRepository(this.database);
    this.localCi = new SqliteLocalCiExecutionRepository(this.database);
    this.ciRunHistory = new SqliteCiRunHistoryRepository(this.database);
  }

  // #endregion

  // #region Methods

  /**
   * Applies feature-owned schemas in the original runtime initialization order.
   *
   * @public
   */
  public initialize(): void {
    for (const schema of runtimeSchemas) this.database.connection.exec(schema);
  }

  /**
   * Removes the workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public removeWorkspace(workspaceId: string): void {
    this.database.immediateTransaction(() => {
      this.database.connection
        .prepare('DELETE FROM repository_trust_grants WHERE workspace_id = ?')
        .run(workspaceId);
      this.database.connection
        .prepare('DELETE FROM verification_plans WHERE workspace_id = ?')
        .run(workspaceId);
      this.database.connection
        .prepare('DELETE FROM verification_runs WHERE workspace_id = ?')
        .run(workspaceId);
      this.database.connection
        .prepare('DELETE FROM local_ci_executions WHERE workspace_id = ?')
        .run(workspaceId);
      this.database.connection
        .prepare('DELETE FROM ci_run_history WHERE workspace_id = ?')
        .run(workspaceId);
    });
  }

  /**
   * Releases the connection after all of its composed users stop.
   *
   * @public
   */
  public close(): void {
    this.database.close();
  }

  // #endregion
}
