// #region Imports

import { activeWorkItemCoordination, type IWorkItem } from '@symphony/domain-work';
import type { IExecutionQueueEntry } from '../model/IExecutionQueueEntry';
import type { IExecutionRecord } from '../model/IExecutionRecord';
import { isActiveExecution } from '../model/isActiveExecution';
import { isCompletedAnalysis } from '../model/isCompletedAnalysis';
import { queueEntryForWorkItem } from '../model/queueEntryForWorkItem';
import {
  findStage,
  type IWorkflowStage,
  stageExecutesRole,
  stageForRole,
} from '@symphony/domain-workflow';
import type { IWorkItemAction } from '@symphony/domain-work';

// #endregion

/**
 * Every step the item's stage offers, in the order a surface should present them.
 *
 * Only steps the stage executes are offered: the orchestrator refuses a role the stage does not
 * run, so an action for one could never do anything but raise an error.
 */
export function resolveWorkItemActions(
  item: IWorkItem,
  executions: readonly IExecutionRecord[],
  stages: readonly IWorkflowStage[],
  executionQueue: readonly IExecutionQueueEntry[] = [],
  now: Date = new Date(),
): readonly IWorkItemAction[] {
  const history = executions
    .filter((execution) => execution.workItemId === item.id)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  // An expired lease means the owning orchestrator is gone, so the item is actionable again.
  const claim = activeWorkItemCoordination(item.coordination, now);
  const claimedElsewhere =
    claim && !history.some((execution) => execution.workItemClaim?.id === claim.claimId);
  if (claimedElsewhere) return [];

  const active = history.find(isActiveExecution);
  if (active) {
    return [
      {
        id: 'cancel',
        kind: 'cancel',
        label: 'Cancel run',
        executionId: active.id,
      },
    ];
  }

  // A queued step is an accepted decision that only lacks a free slot, so the item offers
  // withdrawal instead of a second start that the orchestrator would refuse anyway.
  const queued = queueEntryForWorkItem(executionQueue, item.id);
  if (queued) {
    return [
      {
        id: 'dequeue',
        kind: 'dequeue',
        label: queued.kind === 'analysis' ? 'Remove queued analysis' : 'Remove queued run',
        queueEntryId: queued.id,
      },
    ];
  }

  const actions: IWorkItemAction[] = [];
  const stage = findStage(stages, item.stageId);
  for (const decision of stage?.kind === 'human-gate' ? (stage.decisions ?? []) : []) {
    actions.push({
      id: `decide-${decision.id}`,
      kind: 'decide',
      label: decision.label,
      effect: decision.effect,
      optionId: decision.id,
    });
  }

  const latestAnalysis = history.find(
    (execution) => execution.kind === undefined || execution.kind === 'analysis',
  );
  const latestSolution = history.find(
    (execution) => execution.kind === 'solution' || execution.kind === 'revision',
  );
  const hasAnalysis = history.some(isCompletedAnalysis);

  if (stageExecutesRole(stages, item.stageId, 'analyze')) {
    actions.push({ id: 'analyze', kind: 'analyze', ...analysisStep(latestAnalysis, hasAnalysis) });
  }
  if (stageExecutesRole(stages, item.stageId, 'solve')) {
    actions.push({
      id: 'solve',
      kind: 'solve',
      ...solutionStep(latestSolution, hasAnalysis, stages),
    });
  }

  if (
    latestSolution?.state === 'succeeded' &&
    latestSolution.workspacePath &&
    latestSolution.workspaceReference &&
    !latestSolution.pullRequest
  ) {
    actions.push({
      id: 'publish-pull-request',
      kind: 'publish-pull-request',
      label: 'Create pull request',
      executionId: latestSolution.id,
    });
  }

  return actions;
}

function analysisStep(
  latest: IExecutionRecord | undefined,
  hasAnalysis: boolean,
): Pick<IWorkItemAction, 'label' | 'repeat'> {
  if (latest?.state === 'failed') return { label: 'Retry analysis', repeat: true };
  if (latest?.state === 'cancelled') return { label: 'Restart analysis', repeat: true };
  return hasAnalysis ? { label: 'Re-analyze', repeat: true } : { label: 'Analyze now' };
}

function solutionStep(
  latest: IExecutionRecord | undefined,
  hasAnalysis: boolean,
  stages: readonly IWorkflowStage[],
): Pick<IWorkItemAction, 'label' | 'repeat' | 'blockedReason' | 'requiresFeedback'> {
  if (!hasAnalysis) {
    const analysisStage = findStage(stages, stageForRole(stages, 'analyze'));
    return {
      label: 'Implement now',
      blockedReason: analysisStage
        ? `No completed analysis. Move the item back to ${analysisStage.label} first.`
        : 'No completed analysis, and no stage in this workflow produces one.',
    };
  }
  if (latest?.state === 'failed') {
    // A retained worktree means the step continues the work that is already there; without one it
    // restarts from the default branch. Those are different promises, so they are named apart.
    return latest.workspacePath && latest.workspaceReference
      ? { label: 'Repair implementation', repeat: true }
      : { label: 'Retry implementation', repeat: true };
  }
  if (latest?.state === 'cancelled') return { label: 'Restart implementation', repeat: true };
  if (latest?.state === 'succeeded') {
    return { label: 'Rework implementation', repeat: true, requiresFeedback: true };
  }
  return { label: 'Implement now' };
}
