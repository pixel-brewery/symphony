// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type { IVerificationRepository } from '@symphony/application-ci';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type { IVerificationPlan, IVerificationRun } from '@symphony/domain-ci';
import { verificationSchema } from './VerificationSchema';

// #endregion

interface IPayloadRow {
  readonly payload: string;
}

/**
 * Persists only the Verification records through a shared database owner.
 *
 * @public
 */
export class SqliteVerificationRepository implements IVerificationRepository {
  // #region Fields

  private readonly _database: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Uses the database connection supplied by composition.
   *
   * @param database - Shared SQLite connection owner.
   * @public
   */
  public constructor(database: SqliteDatabase) {
    this._database = database.connection;
  }

  // #endregion

  // #region Methods

  /**
   * Applies this feature's unchanged schema for independent adapter use.
   *
   * @public
   */
  public initialize(): void {
    this._database.exec(verificationSchema);
  }

  /**
   * Saves the verification plan.
   *
   * @param plan - Plan.
   * @public
   */
  public saveVerificationPlan(plan: IVerificationPlan): void {
    this._database
      .prepare(
        `INSERT INTO verification_plans(
           id, repository_binding_id, workspace_id, payload, created_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      )
      .run(
        plan.id,
        plan.repositoryBindingId,
        plan.workspaceId,
        JSON.stringify(plan),
        plan.createdAt,
      );
  }

  /**
   * Returns the verification plan.
   *
   * @param planId - Plan id.
   * @public
   */
  public verificationPlan(planId: string): IVerificationPlan | undefined {
    const row = this._database
      .prepare('SELECT payload FROM verification_plans WHERE id = ?')
      .get(planId) as IPayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as IVerificationPlan) : undefined;
  }

  /**
   * Saves the verification run.
   *
   * @param run - Run.
   * @public
   */
  public saveVerificationRun(run: IVerificationRun): void {
    this._database
      .prepare(
        `INSERT INTO verification_runs(
           id, repository_binding_id, workspace_id, payload, started_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      )
      .run(run.id, run.repositoryBindingId, run.workspaceId, JSON.stringify(run), run.startedAt);
  }

  // #endregion
}
