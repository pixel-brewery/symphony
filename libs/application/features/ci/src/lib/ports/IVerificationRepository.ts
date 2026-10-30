// #region Imports

import type { IVerificationPlan, IVerificationRun } from '@symphony/domain-ci';

// #endregion

/**
 * Retains deterministic verification plans and the runs that used their repository evidence.
 *
 * @public
 */
export interface IVerificationRepository {
  /**
   * Persists the plan bound to an inspected repository revision.
   *
   * @public
   */
  saveVerificationPlan(plan: IVerificationPlan): void;
  /**
   * Reads the retained plan selected for explicit verification.
   *
   * @public
   */
  verificationPlan(planId: string): IVerificationPlan | undefined;
  /**
   * Persists the deterministic run and its observed outcome.
   *
   * @public
   */
  saveVerificationRun(run: IVerificationRun): void;
}
