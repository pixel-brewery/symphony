export interface IWorkflowMaintenanceResult {
  held: number;
  resumedRetries: number;
  resumedBlocked: number;
  escalated: number;
  deferred: number;
  remindedQuestions: number;
  escalatedQuestions: number;
  reconciledStages: number;
}
