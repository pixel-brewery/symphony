// #region Imports

import type { Signal } from '@angular/core';
import type {
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IExecutionQueueEntry,
} from '@symphony/domain-execution';

// #endregion

/** Consumed execution operations exposed to the Core composition facade. @public */
export interface IExecutionOperations {
  /** Whether the actual Delivery publication participant is included. @public @readonly */
  readonly publicationAvailable: boolean;
  readonly activityFresh: Signal<boolean>;
  readonly executionQueue: Signal<readonly IExecutionQueueEntry[]>;
  initialize(): void;
  startAnalyzer(
    simulateFailure: boolean,
    workItemId?: string,
    prompt?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<boolean>;
  delegateWorkItem(
    workItemId: string,
    agentTeamId?: string,
    responsibleAgentId?: string,
    objective?: string,
  ): Promise<boolean>;
  reviewGoal(
    workItemId: string,
    decision: 'approved' | 'revision-required' | 'blocked',
    message: string,
  ): Promise<boolean>;
  assessDeliveryGroup(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: IDeliveryGroup['activationSource'],
    assessmentMode?: 'analyzer' | 'direct',
  ): Promise<IDeliveryGroupProposal | undefined>;
  groupDeliveryDirectly(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: Extract<IDeliveryGroup['activationSource'], 'manual-drag' | 'manual-select'>,
  ): Promise<IDeliveryGroup | undefined>;
  confirmDeliveryGroup(
    proposalId: string,
    attestation?: {
      reason?: string;
    },
  ): Promise<IDeliveryGroup | undefined>;
  rejectDeliveryGroup(proposalId: string, reason?: string): Promise<boolean>;
  dissolveDeliveryGroup(deliveryGroupId: string): Promise<boolean>;
  alignDeliveryGroup(deliveryGroupId: string): Promise<boolean>;
  completeManualAnalysis(workItemId: string, summary: string): Promise<boolean>;
  startSolver(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<boolean>;
  completeManualSolution(workItemId: string, summary: string): Promise<boolean>;
  removeQueueEntry(entryId: string): Promise<boolean>;
  cancelExecution(executionId: string): Promise<boolean>;
  publishPullRequest(executionId: string): Promise<boolean>;
}
