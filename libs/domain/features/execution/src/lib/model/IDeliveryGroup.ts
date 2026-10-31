// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';
import type { DeliveryGroupActivationSource } from './DeliveryGroupActivationSource';
import type { DeliveryGroupState } from './DeliveryGroupState';
import type { IOperatorAttestation } from './IOperatorAttestation';
import type { IPullRequestReference } from '@symphony/domain-delivery';

// #endregion

/** Multiple independent work items delivered by one root-owned workflow. */
export interface IDeliveryGroup {
  id: string;
  workspaceId: string;
  deliveryContextId: string;
  repository: string;
  rootWorkItemId: string;
  /** Root first, then every remaining member exactly once. */
  workItemIds: readonly string[];
  revisions: Readonly<Record<string, number>>;
  stageId?: WorkflowStageId;
  state: DeliveryGroupState;
  activationSource: DeliveryGroupActivationSource;
  proposalId?: string;
  /** Operator's explicit joint-delivery attestation recorded for audit; absent without one. */
  operatorAttestation?: IOperatorAttestation;
  pauseReason?: 'claim-conflict' | 'provider-drift' | 'provider-transition' | 'revision-drift';
  pullRequest?: IPullRequestReference;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  dissolvedAt?: string;
}
