// #region Imports

import type { IWorkflowDefinition, IWorkItemReadiness } from '@symphony/domain-workflow';
import type { IBoardColumn, IWorkItem, ProjectFieldDefinition } from '@symphony/domain-work';
import type { ICiRun, ICiWorkflow, ILocalCiExecution } from '@symphony/domain-ci';
import type {
  IExecutionEvent,
  IExecutionQueueEntry,
  IExecutionRecord,
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IGoalRecord,
} from '@symphony/domain-execution';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IRemoteDataStatus } from '@symphony/domain-core';
import type { IRuntimeHealth } from '@symphony/domain-platform';
import type { ISkillManifest } from '@symphony/domain-skills';

// #endregion

export interface IOrchestrationSnapshot {
  health: IRuntimeHealth;
  workItems: readonly IWorkItem[];
  projectFields?: readonly ProjectFieldDefinition[];
  boardColumns: readonly IBoardColumn[];
  executions: readonly IExecutionRecord[];
  /** Active and historical joint-delivery groups. */
  deliveryGroups?: readonly IDeliveryGroup[];
  /** Analyzer recommendations awaiting or recording a human decision. */
  deliveryGroupProposals?: readonly IDeliveryGroupProposal[];
  /** Accepted steps waiting for a free execution slot, oldest first. */
  executionQueue?: readonly IExecutionQueueEntry[];
  /** Workspace-owned company goals and AI delegations projected without provider secrets. */
  goals?: readonly IGoalRecord[];
  pullRequests?: readonly IPullRequestSummary[];
  ciWorkflows?: readonly ICiWorkflow[];
  ciRuns?: readonly ICiRun[];
  localCiExecutions?: readonly ILocalCiExecution[];
  events: readonly IExecutionEvent[];
  workflow: IWorkflowDefinition;
  /**
   * What the stage guards would find per work item, so a surface judges an item from the same
   * evidence the guards read instead of inferring it from the run history.
   */
  workItemReadiness?: readonly IWorkItemReadiness[];
  skills: readonly ISkillManifest[];
  remoteData?: {
    workItems: IRemoteDataStatus;
    pullRequests?: IRemoteDataStatus;
    ciRuns?: IRemoteDataStatus;
  };
}
