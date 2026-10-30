// #region Imports

import type { IVerificationRepository } from '@symphony/application-ci';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import type { IVerificationPlan, IVerificationRun } from '@symphony/domain-ci';
import { SqliteVerificationRepository } from './SqliteVerificationRepository';

// #endregion

/**
 * Routes Verification state through the shared workspace database registry.
 *
 * @public
 */
export class WorkspaceVerificationRepository implements IVerificationRepository {
  // #region Ctor

  /**
   * Binds shared workspace storage and its immutable routing context.
   *
   * @public
   */
  public constructor(private readonly _registry: WorkspaceDatabaseRegistry) {}

  // #endregion

  // #region Methods

  /**
   * Saves the verification plan.
   *
   * @param plan - Plan.
   * @public
   */
  public saveVerificationPlan(plan: IVerificationPlan): void {
    this.repositoryFor(plan.workspaceId).saveVerificationPlan(plan);
  }

  /**
   * Returns the verification plan.
   *
   * @param planId - Plan id.
   * @public
   */
  public verificationPlan(planId: string): IVerificationPlan | undefined {
    for (const workspaceId of this._registry.workspaceIds()) {
      const plan = this.repositoryFor(workspaceId).verificationPlan(planId);
      if (plan) return plan;
    }
    return undefined;
  }

  /**
   * Saves the verification run.
   *
   * @param run - Run.
   * @public
   */
  public saveVerificationRun(run: IVerificationRun): void {
    this.repositoryFor(run.workspaceId).saveVerificationRun(run);
  }

  private repositoryFor(workspaceId: string): SqliteVerificationRepository {
    return new SqliteVerificationRepository(this._registry.databaseFor(workspaceId));
  }

  // #endregion
}
