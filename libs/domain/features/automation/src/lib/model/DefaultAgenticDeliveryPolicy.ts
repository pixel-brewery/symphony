// #region Imports

import type { IAgenticDeliveryPolicy } from './IAgenticDeliveryPolicy';

// #endregion

export const defaultAgenticDeliveryPolicy: Readonly<IAgenticDeliveryPolicy> = {
  enabled: false,
  observeFailures: false,
  aiDiagnosisEnabled: false,
  sourceRepairEnabled: false,
  workflowRepairEnabled: false,
  reviewFeedbackEnabled: false,
  managedBranchUpdatesEnabled: false,
  conflictSerializationEnabled: false,
  ciRerunEnabled: false,
  replacementPullRequestEnabled: false,
  diagnosisTokenBudget: 20_000,
  repairTokenBudget: 80_000,
  dailyTokenBudget: 200_000,
  maxAttempts: 2,
  maxParallelRepairs: 1,
  cooldownMinutes: 15,
};
