export interface IAgenticDeliveryPolicy {
  enabled: boolean;
  observeFailures: boolean;
  aiDiagnosisEnabled: boolean;
  sourceRepairEnabled: boolean;
  workflowRepairEnabled: boolean;
  reviewFeedbackEnabled: boolean;
  managedBranchUpdatesEnabled: boolean;
  conflictSerializationEnabled: boolean;
  ciRerunEnabled: boolean;
  replacementPullRequestEnabled: boolean;
  diagnosisTokenBudget: number;
  repairTokenBudget: number;
  dailyTokenBudget: number;
  maxAttempts: number;
  maxParallelRepairs: number;
  cooldownMinutes: number;
}
