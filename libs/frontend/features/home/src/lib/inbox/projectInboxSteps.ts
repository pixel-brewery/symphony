// #region Imports

import { isCompletedAnalysis, type IExecutionRecord } from '@symphony/domain-execution';
import { findStage, stageExecutesRole } from '@symphony/domain-workflow';
import { resolvePullRequestActionStatus } from '@symphony/frontend-core';
import type { IInboxStep } from './IInboxStep';
import type { IInboxStepInput } from './IInboxStepInput';
import type { InboxStepState } from './InboxStepState';

// #endregion

/**
 * Projects the five-stage stepper (`Analysis`, `Solution`, `Implementation`, `Checks`,
 * `Acceptance`) of an Inbox entry's work item from its recorded executions, its delegated goal,
 * the checks of its pull request and the stage it rests in. A stage the item has already passed
 * in the workflow counts as done even where no run was recorded for it.
 *
 * `Solution` is the decision how the item is implemented: it waits on a person while the entry
 * asks for it, and is done once an implementation or an assignment exists. `Checks` count as done
 * once the item rests at or behind the acceptance gate, because only passing verification moves
 * it there. A stage the data cannot place stays `pending`; the stepper never claims progress the
 * records do not show.
 *
 * @param input - The entry and the workspace data the stepper reads.
 * @returns The five stages in order, or none for an entry without a work item.
 * @public
 */
export function projectInboxSteps(input: IInboxStepInput): readonly IInboxStep[] {
  const item = input.entry.workItem;
  if (!item) return [];
  const history = input.executions
    .filter((execution) => execution.workItemId === item.id)
    .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt));
  const agentNames = new Map(input.agents.map((agent) => [agent.id, agent.displayName]));
  const goal = input.goals.find((candidate) => candidate.workItemId === item.id);
  const stage = findStage(input.stages, item.stageId);
  const stageIndex = stage ? input.stages.indexOf(stage) : -1;
  const firstImplementingIndex = input.stages.findIndex((candidate) =>
    stageExecutesRole(input.stages, candidate.id, 'solve'),
  );
  const analyzingIndex = input.stages.findIndex((candidate) =>
    stageExecutesRole(input.stages, candidate.id, 'analyze'),
  );
  const pastAnalysis = analyzingIndex >= 0 && stageIndex > analyzingIndex;
  const pastImplementation =
    firstImplementingIndex >= 0 &&
    stageIndex > firstImplementingIndex &&
    (stage?.kind === 'human-gate' || stage?.kind === 'terminal');

  const analyses = history.filter(isAnalysisStep);
  const completedAnalysis = history.find(isCompletedAnalysis);
  const latestAnalysis = analyses[0];
  const implementations = history.filter(
    (execution) => execution.kind === 'solution' || execution.kind === 'revision',
  );
  const latestImplementation = implementations[0];

  const analysis: IInboxStep = completedAnalysis
    ? {
        id: 'analysis',
        state: 'done',
        ...actor(completedAnalysis, agentNames),
        ...finished(completedAnalysis),
      }
    : { id: 'analysis', state: pastAnalysis ? 'done' : stateOf(latestAnalysis) };

  const solution: IInboxStep =
    input.entry.kind === 'solution'
      ? { id: 'solution', state: 'attention' }
      : latestImplementation
        ? { id: 'solution', state: 'done', ...actor(latestImplementation, agentNames) }
        : goal
          ? {
              id: 'solution',
              state: 'done',
              ...nameOf(goal.assignment.responsibleAgentId, agentNames),
            }
          : { id: 'solution', state: pastImplementation ? 'done' : 'pending' };

  const implementation: IInboxStep = latestImplementation
    ? {
        id: 'implementation',
        state: stateOf(latestImplementation),
        ...actor(latestImplementation, agentNames),
        ...finished(latestImplementation),
      }
    : { id: 'implementation', state: pastImplementation ? 'done' : 'pending' };

  const pullRequestReference = history.find((execution) => execution.pullRequest)?.pullRequest;
  const pullRequest = pullRequestReference
    ? input.pullRequests.find(
        (candidate) =>
          candidate.number === pullRequestReference.number &&
          candidate.externalUrl === pullRequestReference.externalUrl,
      )
    : undefined;
  const checkStatus = pullRequest
    ? resolvePullRequestActionStatus(pullRequest, input.ciRuns, input.localCiExecutions)
    : undefined;
  const checks: IInboxStep = pastImplementation
    ? { id: 'checks', state: 'done' }
    : {
        id: 'checks',
        state:
          checkStatus?.state === 'succeeded'
            ? 'done'
            : checkStatus?.state === 'failed'
              ? 'attention'
              : checkStatus?.state === 'in-progress' || checkStatus?.state === 'queued'
                ? 'active'
                : 'pending',
      };

  const acceptance: IInboxStep = {
    id: 'acceptance',
    state:
      input.entry.kind === 'acceptance'
        ? 'attention'
        : stage?.kind === 'terminal'
          ? 'done'
          : 'pending',
  };

  return [analysis, solution, implementation, checks, acceptance];
}

function isAnalysisStep(execution: IExecutionRecord): boolean {
  return (
    (execution.kind === undefined || execution.kind === 'analysis') &&
    (execution.skillFlowRole === undefined || execution.skillFlowRole === 'analysis')
  );
}

function stateOf(execution: IExecutionRecord | undefined): InboxStepState {
  switch (execution?.state) {
    case 'succeeded':
      return 'done';
    case 'queued':
    case 'running':
    case 'waiting':
      return 'active';
    case 'failed':
      return 'attention';
    case 'cancelled':
    case undefined:
      return 'pending';
  }
}

function actor(
  execution: IExecutionRecord,
  agentNames: ReadonlyMap<string, string>,
): Pick<IInboxStep, 'agentName' | 'manual'> {
  if (execution.mode === 'manual') return { manual: true };
  return nameOf(execution.bindingSnapshot?.agentProfileId, agentNames);
}

function nameOf(
  agentId: string | undefined,
  agentNames: ReadonlyMap<string, string>,
): Pick<IInboxStep, 'agentName'> {
  const name = agentId ? agentNames.get(agentId) : undefined;
  return name ? { agentName: name } : {};
}

function finished(execution: IExecutionRecord): Pick<IInboxStep, 'at'> {
  return execution.finishedAt ? { at: execution.finishedAt } : {};
}
