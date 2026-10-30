// #region Imports

import type { IWorkItemRelationAssessment } from './IWorkItemRelationAssessment';
import type { DeliveryGroupActivationSource } from './DeliveryGroupActivationSource';
import type { IOperatorAttestation } from './IOperatorAttestation';

// #endregion

/** Pending or rejected Analyzer recommendation for a provider-neutral delivery group. */
export interface IDeliveryGroupProposal {
  id: string;
  workspaceId: string;
  deliveryContextId: string;
  repository: string;
  rootWorkItemId: string;
  workItemIds: readonly string[];
  revisions: Readonly<Record<string, number>>;
  assessment: IWorkItemRelationAssessment;
  /** Whether Analyzer evidence was requested or the operator chose a direct visual grouping. */
  assessmentMode?: 'analyzer' | 'direct';
  /** Intent that caused the assessment; absent only on legacy persisted proposals. */
  activationSource?: DeliveryGroupActivationSource;
  /** Operator's explicit joint-delivery attestation recorded for audit; absent without one. */
  operatorAttestation?: IOperatorAttestation;
  state: 'open' | 'rejected' | 'confirmed' | 'stale';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
