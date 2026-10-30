export interface IImplementationContract {
  id: string;
  version: number;
  createdByExecutionId: string;
  createdAt: string;
  deliveryGroupId?: string;
  /** Root first and tied to acceptanceCriteriaByWorkItem. */
  workItemIds?: readonly string[];
  workItemRevisions?: Readonly<Record<string, number>>;
  instructions: string;
  acceptanceCriteria: readonly string[];
  acceptanceCriteriaByWorkItem?: Readonly<Record<string, readonly string[]>>;
  allowedPathPatterns: readonly string[];
  forbiddenPathPatterns: readonly string[];
  allowedCommands: readonly string[];
  maximumChangedFiles: number;
  maximumDiffLines: number;
}
