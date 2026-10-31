// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type {
  IssueDraftDto,
  WorkItemEditorMetadataDto,
  WorkItemMutationDto,
} from '@symphony/ipc-contracts-work';
import type { Signal } from '@angular/core';
import type { IExecutionOperations } from './IExecutionOperations';
import type { IWorkflowOperations } from './IWorkflowOperations';

// #endregion

/**
 * Consumes Work Item commands and readonly projections from the owning feature.
 *
 * @public
 */
export interface IWorkOperations
  extends
    Pick<
      IExecutionOperations,
      | 'startAnalyzer'
      | 'delegateWorkItem'
      | 'reviewGoal'
      | 'assessDeliveryGroup'
      | 'groupDeliveryDirectly'
      | 'confirmDeliveryGroup'
      | 'rejectDeliveryGroup'
      | 'dissolveDeliveryGroup'
      | 'alignDeliveryGroup'
      | 'completeManualAnalysis'
      | 'startSolver'
      | 'completeManualSolution'
      | 'removeQueueEntry'
      | 'cancelExecution'
      | 'publishPullRequest'
    >,
    Pick<IWorkflowOperations, 'loadWorkflowProcess' | 'decideWorkflow' | 'answerWorkflowQuestion'> {
  /** Current editor metadata. @public @readonly */
  readonly workItemMetadata: Signal<WorkItemEditorMetadataDto | undefined>;
  /** Current editor/save activity. @public @readonly */
  readonly workItemsBusy: Signal<boolean>;
  /** Current comment activity. @public @readonly */
  readonly workItemCommentBusy: Signal<boolean>;
  /** Current AI draft activity. @public @readonly */
  readonly issueDraftBusy: Signal<boolean>;
  /** Selected work item projected from the authoritative snapshot. @public @readonly */
  readonly selectedWorkItem: Signal<IWorkItem | undefined>;
  /** Executes loadWorkItemDetails through the owning Work feature. @public */
  loadWorkItemDetails(workItemId: string): Promise<boolean>;
  /** Executes loadWorkItemMetadata through the owning Work feature. @public */
  loadWorkItemMetadata(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
  ): Promise<boolean>;
  /** Executes loadAssignableUsers through the owning Work feature. @public */
  loadAssignableUsers(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
    notifyOnFailure?: boolean,
  ): Promise<WorkItemEditorMetadataDto['assignees'] | undefined>;
  /** Executes createWorkItem through the owning Work feature. @public */
  createWorkItem(item: WorkItemMutationDto): Promise<IWorkItem | undefined>;
  /** Executes updateWorkItem through the owning Work feature. @public */
  updateWorkItem(workItemId: string, item: WorkItemMutationDto): Promise<IWorkItem | undefined>;
  /** Executes commentOnWorkItem through the owning Work feature. @public */
  commentOnWorkItem(workItemId: string, body: string): Promise<IWorkItem | undefined>;
  /** Executes moveWorkItem through the owning Work feature. @public */
  moveWorkItem(workItemId: string, boardColumnId: string, columnLabel?: string): Promise<boolean>;
  /** Executes draftIssue through the owning Work feature. @public */
  draftIssue(
    payload: Omit<RequestPayload<'work-items.draft'>, 'operationId'>,
  ): Promise<IssueDraftDto | undefined>;
  /** Executes cancelIssueDraft through the owning Work feature. @public */
  cancelIssueDraft(): Promise<boolean>;
  /** Executes moveDeliveryGroup through the owning Work feature. @public */
  moveDeliveryGroup(
    deliveryGroupId: string,
    rootWorkItemId: string,
    boardColumnId: string,
    columnLabel?: string,
  ): Promise<boolean>;
}
