// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IRailRun } from './IRailRun';
import type { IRailRunInput } from './IRailRunInput';
import type { IRailRunSourceState } from './IRailRunSourceState';
import { actionMessage } from './actionMessage';

// #endregion

function activeLocalRailRun(
  input: IRailRunInput,
  ciRuns: ReadonlyMap<string, ICiRun>,
): IRailRun | undefined {
  const active = input.activeLocalCiRun;
  if (!active) return undefined;
  const run = ciRuns.get(active.runId);
  return {
    id: `local-action:active:${active.runId}`,
    kind: 'local-action',
    sourceLabel: run ? 'Action' : 'Local runner',
    sources: [
      ...(run ? [runSourceState('github', run.status)] : []),
      runSourceState('local-runner', 'in-progress'),
    ],
    title: run?.name ?? 'Local workflow',
    message: run
      ? actionMessage(run, input.repositoryNames)
      : 'Managed runner is preparing this workflow.',
    state: 'in-progress',
    statusLabel: 'In progress',
    startedAt: active.startedAt,
    active: true,
    ciRunId: active.runId,
    ...(run?.runAttempt ? { runAttempt: run.runAttempt } : {}),
    ...(run?.externalUrl ? { externalUrl: run.externalUrl } : {}),
  };
}

function executionPhase(execution: IExecutionRecord): string {
  if (execution.kind === 'revision') return 'Revision';
  if (execution.kind === 'solution') return 'Implementation';
  return 'Analysis';
}

function statusLabel(state: string): string {
  switch (state) {
    case 'in-progress':
    case 'running':
      return 'In progress';
    case 'queued':
      return 'Queued';
    case 'waiting':
      return 'Waiting';
    case 'paused':
      return 'Paused';
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return state;
  }
}

function runSourceState(kind: IRailRunSourceState['kind'], state: string): IRailRunSourceState {
  return {
    kind,
    label: kind === 'github' ? 'GitHub' : 'Local runner',
    state,
  };
}

function railTimestamp(run: IRailRun): string {
  return run.finishedAt ?? run.startedAt;
}

/** Builds one newest-first run timeline without coupling the shell to a CI provider. */
export function buildRailRuns(input: IRailRunInput): readonly IRailRun[] {
  const workItems = new Map(input.workItems.map((item) => [item.id, item]));
  const ciRuns = new Map(input.ciRuns.map((run) => [run.id, run]));
  const latestMessages = new Map<string, string>();
  for (const event of input.events) latestMessages.set(event.executionId, event.message);

  const agentRuns = input.executions.map((execution): IRailRun => {
    const workItem = workItems.get(execution.workItemId) ?? execution.workItemSnapshot;
    const phase = executionPhase(execution);
    const state = execution.pause?.resumeRequestedAt
      ? 'queued'
      : execution.pause
        ? 'paused'
        : execution.state;
    return {
      id: execution.id,
      kind: 'agent',
      sourceLabel: 'Agent',
      title: workItem ? `${workItem.externalId} · ${phase}` : phase,
      message:
        latestMessages.get(execution.id) ??
        execution.summary ??
        execution.error ??
        'Run in progress',
      state,
      statusLabel: statusLabel(state),
      startedAt: execution.startedAt,
      ...(execution.finishedAt ? { finishedAt: execution.finishedAt } : {}),
      active: execution.pause === undefined && ['running', 'waiting'].includes(execution.state),
      executionId: execution.id,
    };
  });

  /**
   * A waiting step is shown in the same timeline as a running one: from the operator's side it
   * is the same decision, only without a slot yet. It carries no execution ID because nothing
   * has started - the entry ID is what a withdrawal addresses.
   */
  const queuedRuns = input.executionQueue.map((entry, index): IRailRun => {
    const phase = entry.kind === 'analysis' ? 'Analysis' : 'Implementation';
    return {
      // Keyed by the work item, not the entry: at most one step per item ever waits, and a
      // stable key keeps the row addressable while the entry itself is replaced on a retry.
      id: `queued:${entry.workItemId}`,
      kind: 'agent',
      sourceLabel: 'Agent',
      title: `${entry.workItemExternalId} · ${phase}`,
      // The status label already says the step is queued; the message adds where in line it is.
      message: entry.lastError ?? `Position ${index + 1} of ${input.executionQueue.length}`,
      state: 'queued',
      statusLabel: 'Queued',
      startedAt: entry.queuedAt,
      active: false,
      queueEntryId: entry.id,
    };
  });

  const activeLocalRunId = input.activeLocalCiRun?.runId;
  const latestLocalExecutions = new Map<string, (typeof input.localCiExecutions)[number]>();
  for (const execution of input.localCiExecutions) {
    const runAttempt = ciRuns.get(execution.ciRunId)?.runAttempt;
    const executionAttempt = execution.runAttempt ?? 1;
    if (runAttempt !== undefined && executionAttempt !== runAttempt) continue;
    const current = latestLocalExecutions.get(execution.ciRunId);
    if (!current || execution.startedAt.localeCompare(current.startedAt) > 0) {
      latestLocalExecutions.set(execution.ciRunId, execution);
    }
  }
  const locallyExecutedRunIds = new Set([
    ...latestLocalExecutions.keys(),
    ...(activeLocalRunId ? [activeLocalRunId] : []),
  ]);

  const cloudRuns = input.ciRuns
    .filter((run) => !locallyExecutedRunIds.has(run.id))
    .map((run): IRailRun => ({
      id: `cloud-action:${run.id}`,
      kind: 'cloud-action',
      sourceLabel: 'GitHub',
      sources: [runSourceState('github', run.status)],
      title: run.name,
      message: actionMessage(run, input.repositoryNames),
      state: run.status,
      statusLabel: statusLabel(run.status),
      startedAt: run.startedAt ?? run.finishedAt ?? '',
      ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
      active: run.status === 'in-progress',
      ciRunId: run.id,
      ...(run.runAttempt ? { runAttempt: run.runAttempt } : {}),
      ...(run.externalUrl ? { externalUrl: run.externalUrl } : {}),
    }));

  const localRuns = [...latestLocalExecutions.values()]
    .filter((execution) => execution.ciRunId !== activeLocalRunId)
    .map((execution): IRailRun => {
      const run = ciRuns.get(execution.ciRunId);
      return {
        id: `local-action:${execution.id}`,
        kind: 'local-action',
        sourceLabel: run ? 'Action' : 'Local runner',
        sources: [
          ...(run ? [runSourceState('github', run.status)] : []),
          runSourceState('local-runner', execution.state),
        ],
        title: run?.name ?? 'Local workflow',
        message: run
          ? actionMessage(run, input.repositoryNames)
          : (input.repositoryNames[execution.repositoryBindingId] ?? execution.repositoryBindingId),
        state: execution.state,
        statusLabel: statusLabel(execution.state),
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        active: false,
        ciRunId: execution.ciRunId,
        ...((run?.runAttempt ?? execution.runAttempt)
          ? { runAttempt: run?.runAttempt ?? execution.runAttempt }
          : {}),
        ...(execution.failureLog ? { failureLog: execution.failureLog } : {}),
        ...(execution.localDiagnostics ? { localDiagnostics: execution.localDiagnostics } : {}),
        ...(run?.externalUrl ? { externalUrl: run.externalUrl } : {}),
      };
    });

  const activeLocalRun = activeLocalRailRun(input, ciRuns);
  // Waiting steps stay on top in the order they will run: the rest of the rail is history,
  // newest first, and a queue entry sinking into it would read as something already done.
  return [
    ...queuedRuns,
    ...[...agentRuns, ...cloudRuns, ...localRuns, ...(activeLocalRun ? [activeLocalRun] : [])]
      .toSorted((left, right) => railTimestamp(right).localeCompare(railTimestamp(left)))
      .slice(0, 100),
  ];
}
