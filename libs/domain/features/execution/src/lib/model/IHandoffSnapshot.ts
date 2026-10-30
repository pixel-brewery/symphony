export interface IHandoffSnapshot {
  id: string;
  occurredAt: string;
  fromAgentId: string;
  toAgentId: string;
  reason: string;
  executionId: string;
  changedFiles: readonly string[];
  completedChecks: readonly string[];
  openSteps: readonly string[];
}
