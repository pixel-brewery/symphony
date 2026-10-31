// #region Imports

import type { GoalState } from './GoalState';
import type { IGoalReviewDecision } from './IGoalReviewDecision';
import type { IGoalVerificationReport } from './IGoalVerificationReport';
import type { IHandoffSnapshot } from './IHandoffSnapshot';
import type { IImplementationContract } from './IImplementationContract';
import type { IWorkItemAgentAssignment } from './IWorkItemAgentAssignment';
import type { SkillFlowRole } from '@symphony/domain-skills';

// #endregion

/** Durable outer-loop state. Inner provider loops remain owned by their agent runtime. */
export interface IGoalRecord {
  id: string;
  workspaceId: string;
  workItemId: string;
  deliveryGroupId?: string;
  /** Root first. Missing on legacy single-item goals. */
  workItemIds?: readonly string[];
  workItemRevisions?: Readonly<Record<string, number>>;
  assignment: IWorkItemAgentAssignment;
  state: GoalState;
  currentRole: SkillFlowRole;
  currentExecutionId?: string;
  executingAgentId?: string;
  implementationContract?: IImplementationContract;
  handoffs: readonly IHandoffSnapshot[];
  verificationReports: readonly IGoalVerificationReport[];
  reviewDecisions: readonly IGoalReviewDecision[];
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
}
