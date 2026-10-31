// #region Imports

import type { ClosureReasonCode } from './ClosureReasonCode';
import type { HumanDecisionEffect } from './HumanDecisionEffect';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

/** A decision recorded against a work item, always attributable to a person. */
export interface IHumanDecision {
  readonly id: string;
  readonly workItemId: string;
  readonly stageId: WorkflowStageId;
  readonly optionId: string;
  readonly effect: HumanDecisionEffect;
  readonly targetStageId?: WorkflowStageId;
  readonly closureReason?: ClosureReasonCode;
  readonly decidedBy: string;
  readonly decidedAt: string;
  readonly note?: string;
  /** How the decision reached Symphony. Tracker decisions are reconciled, not requested. */
  readonly source: 'operator' | 'tracker';
  /** Commit the acceptance applies to; required by acceptance guards. */
  readonly commitSha?: string;
}
