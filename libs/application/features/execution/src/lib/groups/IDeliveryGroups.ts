// #region Imports

import type {
  IExecutionRecord,
  IDeliveryGroup,
  IDeliveryGroupProposal,
} from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { IPullRequestReference } from '@symphony/domain-delivery';

// #endregion

/** Commands exposed by the single groups owner. @public */
export interface IDeliveryGroups {
  assessDeliveryGroup(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: IDeliveryGroup['activationSource'],
    assessmentMode?: 'analyzer' | 'direct',
  ): Promise<IDeliveryGroupProposal>;
  groupDeliveryDirectly(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: Extract<IDeliveryGroup['activationSource'], 'manual-drag' | 'manual-select'>,
  ): Promise<IDeliveryGroup>;
  confirmDeliveryGroup(
    proposalId: string,
    attestation?: {
      reason?: string;
    },
  ): Promise<IDeliveryGroup>;
  rejectDeliveryGroup(proposalId: string, reason?: string): Promise<IDeliveryGroupProposal>;
  dissolveDeliveryGroup(groupId: string): Promise<IDeliveryGroup>;
  alignDeliveryGroup(groupId: string): Promise<IDeliveryGroup>;
  activeDeliveryGroupForRoot(workItemId: string): IDeliveryGroup | undefined;
  pauseDeliveryGroup(
    group: IDeliveryGroup,
    pauseReason: NonNullable<IDeliveryGroup['pauseReason']>,
  ): void;
  groupedDeliveryRequest(group: IDeliveryGroup, workItems: readonly IWorkItem[]): string;
  assertNoCriticalPathCollision(workItem: IWorkItem): void;
  synchronizeDeliveryGroupPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    pullRequest: IPullRequestReference,
  ): Promise<void>;
  reconcileDeliveryGroupDrift(workItems: readonly IWorkItem[]): void;
  refreshRelationshipProposals(workItems: readonly IWorkItem[]): Promise<void>;
}
