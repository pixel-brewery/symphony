export interface IAutomationSourceCheckpoint {
  sourceId: string;
  workspaceId: string;
  initializedAt: string;
  /** Last successful provider scan. Missing on legacy checkpoints. */
  synchronizedAt?: string;
}
