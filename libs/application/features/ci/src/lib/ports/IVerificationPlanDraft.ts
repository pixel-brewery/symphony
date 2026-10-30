// #region Imports

import type { IVerificationPlan, IVerificationStep } from '@symphony/domain-ci';

// #endregion

export interface IVerificationPlanDraft {
  readonly technologies: readonly string[];
  readonly evidence: IVerificationPlan['evidence'];
  readonly steps: readonly IVerificationStep[];
}
