// #region Imports

import type {
  IExecutionRecord,
  IGoalRecord,
  IGoalReviewDecision,
  IImplementationContract,
  IGoalVerificationReport,
} from '@symphony/domain-execution';
import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/** Commands exposed by the single goals owner. @public */
export interface IExecutionGoals {
  listGoals(): readonly IGoalRecord[];
  delegateWorkItem(
    workItemId: string,
    agentTeamId: string | undefined,
    responsibleAgentId: string | undefined,
    objective: string | undefined,
  ): Promise<IGoalRecord>;
  reviewGoal(
    workItemId: string,
    decision: IGoalReviewDecision['decision'],
    message: string,
  ): Promise<IGoalRecord>;
  goalForWorkItem(workItemId: string): IGoalRecord | undefined;
  recordFailedGoal(goal: IGoalRecord, failed: IExecutionRecord, error: string): void;
  executionScope(
    workItem: IWorkItem,
    role: SkillFlowRole,
  ): Pick<IExecutionRecord, 'workspaceId' | 'bindingSnapshot'>;
  updateGoalExecution(
    execution: IExecutionRecord,
    state: IGoalRecord['state'],
    role: SkillFlowRole,
  ): void;
  implementationContract(execution: IExecutionRecord, analysis: string): IImplementationContract;
  recordManualAnalysisGoal(
    manualGoal: IGoalRecord,
    execution: IExecutionRecord,
    normalizedSummary: string,
    now: string,
  ): void;
  recordManualSolutionGoal(
    manualGoal: IGoalRecord,
    execution: IExecutionRecord,
    verificationReport: IGoalVerificationReport,
    now: string,
  ): void;
  recordAnalysisGoal(goal: IGoalRecord, completed: IExecutionRecord, summary: string): void;
  effectiveImplementationContract(
    execution: IExecutionRecord,
    goal: IGoalRecord | undefined,
    analysis: string,
  ): IImplementationContract;
  recordVerifiedGoal(
    goal: IGoalRecord,
    current: IExecutionRecord,
    contract: IImplementationContract,
    verificationReport: IGoalVerificationReport,
    failures: readonly string[],
    repairing: boolean,
  ): void;
  recordGoalHandoff(
    goal: IGoalRecord,
    executionId: string,
    previousAgentId: string,
    nextAgentId: string,
    changeSet: {
      readonly changedFiles: readonly string[];
    },
    now: string,
  ): void;
}
