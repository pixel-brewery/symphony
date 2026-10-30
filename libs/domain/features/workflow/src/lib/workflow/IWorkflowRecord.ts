// #region Imports

import type { IAnalysisArtifact } from './IAnalysisArtifact';
import type { IHumanDecisionRequest } from './IHumanDecisionRequest';
import type { IWorkflowArtifactReference } from './IWorkflowArtifactReference';
import type { IWorkflowClaim } from './IWorkflowClaim';
import type { IWorkflowCounters } from './IWorkflowCounters';
import type { IWorkflowRevisions } from './IWorkflowRevisions';
import type { IWorkflowRouting } from './IWorkflowRouting';
import type { IWorkflowRun } from './IWorkflowRun';
import type { WorkflowRuntimeState } from './WorkflowRuntimeState';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

/**
 * Machine-readable truth for one work item. The board column stays the human view; this
 * record decides what may happen next.
 */
export interface IWorkflowRecord {
  readonly workItemId: string;
  readonly workspaceId: string;
  readonly sourceId: string;
  readonly workflowId: string;
  readonly workflowVersion: number;
  readonly stageId: WorkflowStageId;
  readonly runtimeState: WorkflowRuntimeState;
  readonly activeRun?: IWorkflowRun;
  readonly claim?: IWorkflowClaim;
  readonly revisions: IWorkflowRevisions;
  readonly routing: IWorkflowRouting;
  readonly counters: IWorkflowCounters;
  readonly artifacts: readonly IWorkflowArtifactReference[];
  /** Definition of Ready reported by the latest analyze run; the qualified exit guards read it. */
  readonly analysis?: IAnalysisArtifact;
  readonly humanRequest?: IHumanDecisionRequest;
  readonly pullRequestIds: readonly string[];
  readonly updatedAt: string;
}
