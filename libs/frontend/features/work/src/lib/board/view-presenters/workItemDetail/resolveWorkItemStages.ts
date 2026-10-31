// #region Imports

import { isCompletedAnalysis, type IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItemStage } from './IWorkItemStage';
import type { IWorkItemStageSource } from './IWorkItemStageSource';

// #endregion

const STAGE_IDS = ['analysis', 'solution', 'implementation', 'checks', 'acceptance'] as const;

/**
 * Resolves the five delivery stages of a work item for its stepper.
 *
 * How far the delivery is comes from the board's card state, so the stepper and the card's
 * progress bar can never disagree: steps before `completedSteps` are `done`, the active step is
 * `current` - or `failed` when the card marks it blocked by a failure - and the rest are
 * `pending`. The runs, the goal and the checks add the facts each step's caption names.
 *
 * @param source - The card state and the facts around the item.
 * @returns The stages in delivery order.
 * @public
 */
export function resolveWorkItemStages(source: IWorkItemStageSource): readonly IWorkItemStage[] {
  const { progress, goal, checks } = source;
  const executions = source.executions.toSorted((left, right) =>
    left.startedAt.localeCompare(right.startedAt),
  );
  const analyses = executions.filter(
    (execution) => execution.kind === undefined || execution.kind === 'analysis',
  );
  const latestAnalysis = analyses.at(-1);
  const analysisRun = analyses.filter((execution) => isCompletedAnalysis(execution)).at(-1);
  const solutionRun = executions
    .filter((execution) => execution.kind === 'solution' || execution.kind === 'revision')
    .at(-1);
  const failed = progress.status === 'failed' || progress.status === 'checks-failed';
  const stateAt = (index: number): IWorkItemStage['state'] => {
    if (index < progress.completedSteps) return 'done';
    if (index === progress.blockedStep && failed) return 'failed';
    if (index === progress.activeStep) return 'current';
    return 'pending';
  };
  const runFacts = (execution: IExecutionRecord | undefined) => {
    if (!execution) return {};
    const agentId = execution.bindingSnapshot?.agentProfileId;
    const agentName = agentId
      ? source.agents.find((agent) => agent.id === agentId)?.displayName
      : undefined;
    return {
      activity: execution.state,
      ...(agentName ? { agentName } : {}),
      ...(execution.mode === 'manual' ? { manual: true } : {}),
      at: execution.finishedAt ?? execution.startedAt,
    };
  };
  const checksRunning = checks.filter(
    (check) => check.status === 'queued' || check.status === 'in-progress',
  ).length;
  const planVersion = goal?.implementationContract?.version;

  return STAGE_IDS.map((id, index): IWorkItemStage => {
    const state = stateAt(index);
    switch (id) {
      case 'analysis':
        // While a newer attempt runs or failed, the caption names that attempt.
        return {
          id,
          state,
          ...runFacts(state === 'done' ? (analysisRun ?? latestAnalysis) : latestAnalysis),
        };
      case 'solution':
        return { id, state, ...(planVersion !== undefined ? { planVersion } : {}) };
      case 'implementation':
        return {
          id,
          state,
          ...runFacts(solutionRun),
          ...(solutionRun?.pullRequest
            ? { pullRequestNumber: solutionRun.pullRequest.number }
            : {}),
          ...(solutionRun?.workspaceReference ? { branch: solutionRun.workspaceReference } : {}),
        };
      case 'checks':
        return {
          id,
          state,
          checksTotal: checks.length,
          checksRunning,
          checksFailed: checks.filter((check) => check.status === 'failed').length,
          checksPassed: checks.filter((check) => check.status === 'succeeded').length,
        };
      case 'acceptance':
        return { id, state };
    }
  });
}
