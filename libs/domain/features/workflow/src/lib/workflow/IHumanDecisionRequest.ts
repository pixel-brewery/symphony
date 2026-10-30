// #region Imports

import type { HumanRequiredReasonCode } from './HumanRequiredReasonCode';
import type { ProcessRole } from './ProcessRole';
import type { WorkflowArtifactKind } from './WorkflowArtifactKind';

// #endregion

/** An open question that pauses automation until a person answers it. */
export interface IHumanDecisionRequest {
  readonly id: string;
  readonly raisedAt: string;
  readonly raisedByRole: ProcessRole | 'supervisor';
  readonly reasonCode: HumanRequiredReasonCode;
  readonly question: string;
  readonly rationale: string;
  readonly options: readonly string[];
  readonly consequences: readonly string[];
  readonly invalidates: readonly WorkflowArtifactKind[];
  readonly assignee?: string;
  readonly remindedAt?: string;
  readonly escalatedAt?: string;
}
