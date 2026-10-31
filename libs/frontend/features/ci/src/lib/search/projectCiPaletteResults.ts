// #region Imports

import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import { actionStatusLabel } from '@symphony/frontend-core/delivery';
import { scorePaletteMatch, type IPaletteResult } from '@symphony/frontend-search';

// #endregion

/** Action runs the palette lists at most; the palette cuts the group to the same size. */
const RUN_LIMIT = 4;

/** Workflow commands the palette lists at most. */
const WORKFLOW_LIMIT = 3;

/** Opens Actions, where every workflow offers `Run on GitHub` and `Run locally`. */
const RUN_WORKFLOW: IPaletteResult = {
  id: 'command:run-workflow',
  group: 'commands',
  icon: 'play',
  title: 'Run workflow…',
  rank: 0,
  action: { kind: 'navigate', path: '/main/actions' },
};

/**
 * Projects CI's command palette rows: the Action runs matching the query, newest first among equal
 * matches, each opening its run on Actions; `Run <workflow> on GitHub` for matching workflows that
 * can be started by hand, which opens Actions with that workflow's start (and its confirmation)
 * requested; and `Run workflow…`.
 *
 * @param runs - Action runs of the current projection.
 * @param workflows - Workflow definitions of the current projection.
 * @param normalizedQuery - Locale-lowercased palette input; empty lists only `Run workflow…`.
 * @returns The matching rows.
 * @public
 */
export function projectCiPaletteResults(
  runs: readonly ICiRun[],
  workflows: readonly ICiWorkflow[],
  normalizedQuery: string,
): readonly IPaletteResult[] {
  const runnable = workflows.filter(
    (workflow) => workflow.state === 'active' && workflow.supportsManualDispatch,
  );
  if (!normalizedQuery) return runnable.length > 0 ? [RUN_WORKFLOW] : [];
  const runResults = runs
    .map((run) => ({
      run,
      rank: scorePaletteMatch(
        normalizedQuery,
        [run.name, run.title, run.runNumber === undefined ? undefined : `#${run.runNumber}`],
        [run.actor, run.event, run.branch, run.revision, actionStatusLabel(run.status)],
      ),
    }))
    .filter((match) => match.rank > 0)
    .toSorted(
      (left, right) =>
        right.rank - left.rank || startedAt(right.run).localeCompare(startedAt(left.run)),
    )
    .slice(0, RUN_LIMIT)
    .map(({ run, rank }): IPaletteResult => ({
      id: `action-run:${run.id}`,
      group: 'action-runs',
      icon: 'executionOutline',
      ...(run.title ? { reference: run.name } : {}),
      title: run.title ?? run.name,
      facts: [
        actionStatusLabel(run.status),
        ...(run.branch ? [run.branch] : []),
        ...(run.runNumber === undefined ? [] : [`run #${run.runNumber}`]),
      ],
      rank,
      action: { kind: 'navigate', path: '/main/actions', queryParams: { run: run.id } },
    }));
  const workflowResults = runnable
    .map((workflow) => ({
      workflow,
      rank: scorePaletteMatch(
        normalizedQuery,
        [`Run ${workflow.name} on GitHub`],
        [workflow.path, 'workflow', 'start'],
      ),
    }))
    .filter((match) => match.rank > 0)
    .toSorted((left, right) => right.rank - left.rank)
    .slice(0, WORKFLOW_LIMIT)
    .map(({ workflow, rank }): IPaletteResult => ({
      id: `command:run-workflow:${workflow.id}`,
      group: 'commands',
      icon: 'play',
      title: `Run ${workflow.name} on GitHub`,
      rank,
      action: {
        kind: 'navigate',
        path: '/main/actions',
        queryParams: { workflow: workflow.id, dispatch: 'github' },
      },
    }));
  const commandRank =
    runnable.length > 0
      ? scorePaletteMatch(normalizedQuery, [RUN_WORKFLOW.title], ['actions', 'dispatch', 'start'])
      : 0;
  return [
    ...runResults,
    ...workflowResults,
    ...(commandRank > 0 ? [{ ...RUN_WORKFLOW, rank: commandRank }] : []),
  ];
}

function startedAt(run: ICiRun): string {
  return run.startedAt ?? run.finishedAt ?? '';
}
