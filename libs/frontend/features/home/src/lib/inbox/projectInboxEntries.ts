// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import {
  isActiveExecution,
  isCompletedAnalysis,
  queueEntryForWorkItem,
  type IExecutionRecord,
} from '@symphony/domain-execution';
import type { IAgentProfile } from '@symphony/domain-team';
import type { IWorkItem } from '@symphony/domain-work';
import { findStage, stageExecutesRole, type IWorkflowStage } from '@symphony/domain-workflow';
import type { IInboxEntry } from './IInboxEntry';
import type { IInboxFinding } from './IInboxFinding';
import type { IInboxProjectionInput } from './IInboxProjectionInput';
import type { InboxOption } from './InboxOption';

// #endregion

/** Updates older than this are history, not news. */
const UPDATE_WINDOW_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

/** The Inbox reports the newest updates only; older ones stay on the Board and in Actions. */
const MAXIMUM_UPDATES = 20;

/** Goal states in which an agent is already carrying the item, so nothing waits on a person. */
const GOAL_STATES_IN_FLIGHT = new Set(['implementing', 'verifying']);

/**
 * Projects the Inbox of the active workspace: the decisions that wait for a person and the
 * updates of the last seven days, each newest first, decisions before updates.
 *
 * A decision is raised from data the guards and commands already own, so acting on it calls the
 * same command the Board or Actions would:
 *
 * - `solution`: the item rests in a stage that implements, its newest completed analysis has no
 *   later implementation, and nothing runs or waits in the queue for it.
 * - `acceptance`: the item rests at a human gate behind the implementing stages, or its delegated
 *   goal waits for review.
 * - `delivery-group`: an open Analyzer proposal to deliver several items together.
 * - `failing-workflow`: the newest finished run of a workflow failed.
 *
 * Entries snoozed for this session are left out until their time has passed.
 *
 * @param input - The workspace data the projection reads.
 * @returns The entries in display order.
 * @public
 */
export function projectInboxEntries(input: IInboxProjectionInput): readonly IInboxEntry[] {
  const historyByItem = groupExecutions(input.executions);
  const agentNames = new Map(input.agents.map((agent) => [agent.id, agent.displayName]));
  const columnLabels = new Map(input.boardColumns.map((column) => [column.id, column.label]));
  const readiness = new Map(input.readiness.map((entry) => [entry.workItemId, entry]));
  const goals = new Map(input.goals.map((goal) => [goal.workItemId, goal]));
  const firstImplementingIndex = input.stages.findIndex((stage) =>
    stageExecutesRole(input.stages, stage.id, 'solve'),
  );

  const decisions: IInboxEntry[] = [];
  const decidedItemIds = new Set<string>();
  for (const item of input.workItems) {
    const history = historyByItem.get(item.id) ?? [];
    const base = {
      workItem: item,
      ...(item.boardColumnId && columnLabels.has(item.boardColumnId)
        ? { columnLabel: columnLabels.get(item.boardColumnId) }
        : {}),
      ...pullRequestNumberOf(history),
    };
    const goal = goals.get(item.id);
    const stage = findStage(input.stages, item.stageId);
    const stageIndex = stage ? input.stages.indexOf(stage) : -1;
    const busy =
      history.some(isActiveExecution) ||
      Boolean(queueEntryForWorkItem(input.executionQueue, item.id));

    if (
      goal?.state === 'reviewing' ||
      isAcceptanceGate(stage, stageIndex, firstImplementingIndex)
    ) {
      if (busy) continue;
      const solution = history.find(isImplementation);
      decisions.push({
        ...base,
        id: `acceptance:${item.id}`,
        group: 'decision',
        kind: 'acceptance',
        at:
          latest(
            goal?.state === 'reviewing' ? goal.updatedAt : undefined,
            solution?.finishedAt,
            item.updatedAt,
          ) ??
          item.createdAt ??
          new Date(input.now).toISOString(),
        ...agentOf(solution, agentNames),
        findings: summaryFinding(solution?.summary),
        options:
          goal?.state === 'reviewing'
            ? [
                { id: 'review-approved', kind: 'review-goal', decision: 'approved' },
                { id: 'review-revision', kind: 'review-goal', decision: 'revision-required' },
              ]
            : (stage?.decisions ?? []).map((decision) => ({
                id: `decide-${decision.id}`,
                kind: 'decide' as const,
                optionId: decision.id,
                label: decision.label,
                ...(decision.description ? { description: decision.description } : {}),
                effect: decision.effect,
              })),
      });
      decidedItemIds.add(item.id);
      continue;
    }

    if (
      busy ||
      !stageExecutesRole(input.stages, item.stageId, 'solve') ||
      (goal && GOAL_STATES_IN_FLIGHT.has(goal.state))
    ) {
      continue;
    }
    const analysis = history.find(isCompletedAnalysis);
    if (!analysis) continue;
    if (
      history.some(
        (execution) => isImplementation(execution) && execution.startedAt > analysis.startedAt,
      )
    ) {
      continue;
    }
    const open = readiness.get(item.id)?.openDecisions ?? [];
    decisions.push({
      ...base,
      id: `solution:${item.id}`,
      group: 'decision',
      kind: 'solution',
      at: analysis.finishedAt ?? analysis.startedAt,
      executionKind: 'analysis',
      ...agentOf(analysis, agentNames),
      findings: [
        ...summaryFinding(analysis.summary),
        ...open.map((text): IInboxFinding => ({ tone: 'open', text })),
      ],
      options: [
        ...assignmentOptions(item, input),
        { id: 'record-solution', kind: 'record-solution' },
      ],
    });
    decidedItemIds.add(item.id);
  }

  const itemsById = new Map(input.workItems.map((item) => [item.id, item]));
  for (const proposal of input.deliveryGroupProposals) {
    const root = itemsById.get(proposal.rootWorkItemId);
    if (proposal.state !== 'open' || !root) continue;
    decisions.push({
      id: `delivery-group:${proposal.id}`,
      group: 'decision',
      kind: 'delivery-group',
      at: proposal.createdAt,
      workItem: root,
      ...(root.boardColumnId && columnLabels.has(root.boardColumnId)
        ? { columnLabel: columnLabels.get(root.boardColumnId) }
        : {}),
      workItemCount: proposal.workItemIds.length,
      findings: proposal.assessment.evidence.map((text): IInboxFinding => ({ tone: 'info', text })),
      options: [
        { id: 'confirm-group', kind: 'confirm-group', proposalId: proposal.id },
        { id: 'reject-group', kind: 'reject-group', proposalId: proposal.id },
      ],
    });
  }

  decisions.push(...failingWorkflowEntries(input.ciRuns));

  const updates = [
    ...executionUpdates(input, historyByItem, agentNames, columnLabels, decidedItemIds),
    ...mergedPullRequestUpdates(input, columnLabels),
  ]
    .filter((entry) => input.now - Date.parse(entry.at) <= UPDATE_WINDOW_MILLISECONDS)
    .toSorted(newestFirst)
    .slice(0, MAXIMUM_UPDATES);

  const awake = (entry: IInboxEntry): boolean =>
    (input.snoozedUntil.get(entry.id) ?? Number.NEGATIVE_INFINITY) <= input.now;
  return [...decisions.toSorted(newestFirst), ...updates].filter(awake);
}

/** Newest execution first, per work item. */
function groupExecutions(
  executions: readonly IExecutionRecord[],
): ReadonlyMap<string, readonly IExecutionRecord[]> {
  const groups = new Map<string, IExecutionRecord[]>();
  for (const execution of executions) {
    const group = groups.get(execution.workItemId);
    if (group) group.push(execution);
    else groups.set(execution.workItemId, [execution]);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }
  return groups;
}

/** A human gate behind the first implementing stage is where delivered work is accepted. */
function isAcceptanceGate(
  stage: IWorkflowStage | undefined,
  stageIndex: number,
  firstImplementingIndex: number,
): boolean {
  return (
    stage?.kind === 'human-gate' &&
    firstImplementingIndex >= 0 &&
    stageIndex > firstImplementingIndex
  );
}

function isImplementation(execution: IExecutionRecord): boolean {
  return execution.kind === 'solution' || execution.kind === 'revision';
}

/** The analysis flow role only; CI diagnosis and reviews also record `kind: 'analysis'`. */
function isAnalysis(execution: IExecutionRecord): boolean {
  return (
    (execution.kind === undefined || execution.kind === 'analysis') &&
    (execution.skillFlowRole === undefined || execution.skillFlowRole === 'analysis')
  );
}

function pullRequestNumberOf(history: readonly IExecutionRecord[]): {
  pullRequestNumber?: number;
} {
  const number = history.find((execution) => execution.pullRequest)?.pullRequest?.number;
  return number === undefined ? {} : { pullRequestNumber: number };
}

function agentOf(
  execution: IExecutionRecord | undefined,
  agentNames: ReadonlyMap<string, string>,
): { agentName?: string; manual?: boolean } {
  if (!execution) return {};
  if (execution.mode === 'manual') return { manual: true };
  const name = agentNames.get(execution.bindingSnapshot?.agentProfileId ?? '');
  return name ? { agentName: name } : {};
}

/**
 * The headline of a summary: its first line of prose, skipping headings, tables and code, without
 * list marks or emphasis.
 */
function summaryFinding(summary: string | undefined): readonly IInboxFinding[] {
  let fenced = false;
  for (const raw of (summary ?? '').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) fenced = !fenced;
    if (fenced || !line || line.startsWith('```') || line.startsWith('#') || line.startsWith('|')) {
      continue;
    }
    const text = line
      .replace(/^(?:[-*+]|\d+\.)\s+/, '')
      .replace(/(\*\*|__|`)/g, '')
      .trim();
    if (text) return [{ tone: 'info', text }];
  }
  return [];
}

function latest(...values: readonly (string | undefined)[]): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .toSorted()
    .at(-1);
}

function newestFirst(left: IInboxEntry, right: IInboxEntry): number {
  return right.at.localeCompare(left.at);
}

/**
 * Agents the workspace's teams assign to the implementation, primary first; without such an
 * assignment every enabled agent of the workspace may take it.
 */
function assignmentOptions(item: IWorkItem, input: IInboxProjectionInput): readonly InboxOption[] {
  const agents = input.agents.filter(
    (agent) => agent.enabled && agent.workspaceId === item.workspaceId,
  );
  const teams = input.teams.filter((team) => team.workspaceId === item.workspaceId);
  const assigned: { agent: IAgentProfile; teamId: string }[] = [];
  for (const team of teams) {
    for (const assignment of team.assignments) {
      if (assignment.role !== 'solution') continue;
      for (const agentId of [assignment.primaryAgentId, ...assignment.fallbackAgentIds]) {
        const agent = agents.find((candidate) => candidate.id === agentId);
        if (agent && !assigned.some((entry) => entry.agent.id === agent.id)) {
          assigned.push({ agent, teamId: team.id });
        }
      }
    }
  }
  const candidates = assigned.length
    ? assigned
    : agents.map((agent) => ({ agent, teamId: teams[0]?.id }));
  return candidates.map(({ agent, teamId }) => ({
    id: `assign-${agent.id}`,
    kind: 'assign',
    agentId: agent.id,
    agentName: agent.displayName,
    ...(teamId ? { teamId } : {}),
  }));
}

/** One decision per workflow whose newest finished run failed, with the length of the streak. */
function failingWorkflowEntries(runs: readonly ICiRun[]): readonly IInboxEntry[] {
  const finished = new Map<string, ICiRun[]>();
  for (const run of runs) {
    if (run.status !== 'succeeded' && run.status !== 'failed' && run.status !== 'cancelled') {
      continue;
    }
    const key = `${run.repositoryBindingId}\u0000${run.workflowId ?? run.name}`;
    const group = finished.get(key);
    if (group) group.push(run);
    else finished.set(key, [run]);
  }
  const entries: IInboxEntry[] = [];
  for (const [key, group] of finished) {
    const ordered = group.toSorted((left, right) => runTime(right).localeCompare(runTime(left)));
    const newest = ordered[0];
    if (newest?.status !== 'failed') continue;
    const streak = ordered.findIndex((run) => run.status !== 'failed');
    entries.push({
      id: `failing-workflow:${key.replace('\u0000', ':')}:${newest.id}`,
      group: 'decision',
      kind: 'failing-workflow',
      at: runTime(newest),
      workflowName: newest.name,
      failureStreak: streak === -1 ? ordered.length : streak,
      ...(newest.revision ? { revision: newest.revision } : {}),
      ...(newest.branch ? { branch: newest.branch } : {}),
      findings: [],
      options: [
        { id: 'rerun', kind: 'rerun', runId: newest.id },
        { id: 'open-actions', kind: 'open-actions', workflowName: newest.name },
      ],
    });
  }
  return entries;
}

function runTime(run: ICiRun): string {
  return run.finishedAt ?? run.startedAt ?? '';
}

/**
 * The newest analysis or implementation step of every item, unless the item already raised a
 * decision that tells the same story.
 */
function executionUpdates(
  input: IInboxProjectionInput,
  historyByItem: ReadonlyMap<string, readonly IExecutionRecord[]>,
  agentNames: ReadonlyMap<string, string>,
  columnLabels: ReadonlyMap<string, string>,
  decidedItemIds: ReadonlySet<string>,
): readonly IInboxEntry[] {
  const entries: IInboxEntry[] = [];
  for (const item of input.workItems) {
    if (decidedItemIds.has(item.id)) continue;
    const history = historyByItem.get(item.id) ?? [];
    const execution = history.find(
      (candidate) =>
        (isAnalysis(candidate) || isImplementation(candidate)) && candidate.state !== 'queued',
    );
    if (!execution || (execution.state === 'cancelled' && !execution.pause)) continue;
    entries.push({
      id: `execution:${execution.id}:${execution.state}`,
      group: 'update',
      kind: 'execution',
      at: execution.finishedAt ?? execution.startedAt,
      workItem: item,
      ...(item.boardColumnId && columnLabels.has(item.boardColumnId)
        ? { columnLabel: columnLabels.get(item.boardColumnId) }
        : {}),
      ...pullRequestNumberOf(history),
      ...agentOf(execution, agentNames),
      executionKind: isImplementation(execution) ? (execution.kind ?? 'solution') : 'analysis',
      executionState: execution.state,
      findings: execution.state === 'succeeded' ? summaryFinding(execution.summary) : [],
      options: [],
    });
  }
  return entries;
}

/** Merged pull requests, named by the work item whose implementation opened them. */
function mergedPullRequestUpdates(
  input: IInboxProjectionInput,
  columnLabels: ReadonlyMap<string, string>,
): readonly IInboxEntry[] {
  const itemsById = new Map(input.workItems.map((item) => [item.id, item]));
  return input.pullRequests
    .filter((pullRequest) => pullRequest.state === 'merged')
    .map((pullRequest): IInboxEntry => {
      const execution = input.executions.find(
        (candidate) =>
          candidate.pullRequest?.number === pullRequest.number &&
          candidate.pullRequest.externalUrl === pullRequest.externalUrl,
      );
      const item = execution ? itemsById.get(execution.workItemId) : undefined;
      return {
        id: `merged-pull-request:${pullRequest.id}`,
        group: 'update',
        kind: 'merged-pull-request',
        at: pullRequest.updatedAt,
        pullRequestNumber: pullRequest.number,
        pullRequestTitle: pullRequest.title,
        ...(item
          ? {
              workItem: item,
              ...(item.boardColumnId && columnLabels.has(item.boardColumnId)
                ? { columnLabel: columnLabels.get(item.boardColumnId) }
                : {}),
            }
          : {}),
        findings: [],
        options: [],
      };
    });
}
