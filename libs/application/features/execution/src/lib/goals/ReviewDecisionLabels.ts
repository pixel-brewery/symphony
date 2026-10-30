// #region Imports

import type { IGoalReviewDecision } from '@symphony/domain-execution';

// #endregion

export const reviewDecisionLabels: Record<IGoalReviewDecision['decision'], string> = {
  approved: 'Approved',
  'revision-required': 'Revision required',
  blocked: 'Blocked',
};
