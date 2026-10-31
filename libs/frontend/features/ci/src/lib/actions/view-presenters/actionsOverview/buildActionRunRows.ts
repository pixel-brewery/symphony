// #region Imports

import type { ICiRun, ICiWorkflow, ILocalCiExecution } from '@symphony/domain-ci';
import type { IActionRunRow } from './IActionRunRow';
import { isActiveRunStatus } from './isActiveRunStatus';
import { runTimestamp } from './runTimestamp';

// #endregion

/** Prefix of the request id the store uses while a local workflow start has no GitHub run yet. */
const LOCAL_WORKFLOW_REQUEST_PREFIX = 'workflow:';

/**
 * The latest local execution per GitHub run, limited to the attempt GitHub reports now, exactly
 * as the run panel pairs them.
 */
function latestLocalExecutions(
  runs: ReadonlyMap<string, ICiRun>,
  executions: readonly ILocalCiExecution[],
): ReadonlyMap<string, ILocalCiExecution> {
  const latest = new Map<string, ILocalCiExecution>();
  for (const execution of executions) {
    const runAttempt = runs.get(execution.ciRunId)?.runAttempt;
    if (runAttempt !== undefined && (execution.runAttempt ?? 1) !== runAttempt) continue;
    const current = latest.get(execution.ciRunId);
    if (!current || execution.startedAt.localeCompare(current.startedAt) > 0) {
      latest.set(execution.ciRunId, execution);
    }
  }
  return latest;
}

function rowForRun(
  run: ICiRun,
  local: ILocalCiExecution | undefined,
  activeLocalRun: { readonly runId: string; readonly startedAt: string } | undefined,
): IActionRunRow {
  const base = {
    id: run.id,
    run,
    ...(run.workflowId ? { workflowId: run.workflowId } : {}),
    workflowName: run.name,
    ...(run.branch ? { branch: run.branch } : {}),
    ...(run.revision ? { revision: run.revision } : {}),
    ...(run.event ? { event: run.event } : {}),
    ...(run.actor ? { actor: run.actor } : {}),
    ...(local ? { localExecution: local } : {}),
  };
  if (activeLocalRun?.runId === run.id) {
    return {
      ...base,
      status: 'in-progress',
      runner: 'github-local',
      startedAt: activeLocalRun.startedAt,
      runningLocally: true,
    };
  }
  // The local runner's verdict counts when it is the newer one: a failure reproduced locally
  // after GitHub passed, or a local pass after the GitHub failure it was started to check.
  const localIsNewer =
    local !== undefined &&
    !isActiveRunStatus(run.status) &&
    local.finishedAt.localeCompare(run.finishedAt ?? '') >= 0;
  return {
    ...base,
    status: localIsNewer ? local.state : run.status,
    runner: local ? 'github-local' : 'github',
    ...(localIsNewer
      ? { startedAt: local.startedAt, finishedAt: local.finishedAt }
      : {
          ...(run.startedAt ? { startedAt: run.startedAt } : {}),
          ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
        }),
    runningLocally: false,
  };
}

/**
 * Merges GitHub runs, managed local executions and the active local run into one newest-first
 * list in which every run appears once.
 *
 * @param input - Runs, local executions, the active local run and the workflow definitions.
 * @returns The run rows, newest first.
 * @public
 */
export function buildActionRunRows(input: {
  readonly runs: readonly ICiRun[];
  readonly localExecutions: readonly ILocalCiExecution[];
  readonly activeLocalRun?: { readonly runId: string; readonly startedAt: string };
  readonly workflows: readonly ICiWorkflow[];
}): readonly IActionRunRow[] {
  const runs = new Map(input.runs.map((run) => [run.id, run]));
  const locals = latestLocalExecutions(runs, input.localExecutions);
  const rows: IActionRunRow[] = input.runs.map((run) =>
    rowForRun(run, locals.get(run.id), input.activeLocalRun),
  );

  // Local executions whose GitHub run is no longer in the projection keep their history entry.
  for (const [ciRunId, execution] of locals) {
    if (runs.has(ciRunId) || ciRunId === input.activeLocalRun?.runId) continue;
    rows.push({
      id: ciRunId,
      workflowName: 'Local workflow',
      status: execution.state,
      runner: 'local',
      ...(execution.revision ? { revision: execution.revision } : {}),
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      localExecution: execution,
      runningLocally: false,
    });
  }

  // A local start that has no GitHub run in the projection yet is running all the same.
  const active = input.activeLocalRun;
  if (active && !runs.has(active.runId)) {
    const workflowId = active.runId.startsWith(LOCAL_WORKFLOW_REQUEST_PREFIX)
      ? active.runId.slice(LOCAL_WORKFLOW_REQUEST_PREFIX.length)
      : undefined;
    const workflow = input.workflows.find((candidate) => candidate.id === workflowId);
    rows.push({
      id: active.runId,
      ...(workflow ? { workflowId: workflow.id } : {}),
      workflowName: workflow?.name ?? 'Local workflow',
      status: 'in-progress',
      runner: 'local',
      ...(workflow ? { branch: workflow.defaultBranch } : {}),
      startedAt: active.startedAt,
      runningLocally: true,
    });
  }

  return rows.toSorted((left, right) => runTimestamp(right).localeCompare(runTimestamp(left)));
}
