// #region Imports

import type { IActionDrawerRun } from '../../views/drawers/IActionDrawerRun';
import type { IActionDrawerSourceState } from '../../views/drawers/IActionDrawerSourceState';
import type { IActionRunRow } from './IActionRunRow';

// #endregion

/**
 * Describes a run row the way the Action drawer expects it, so `View log` opens the same drawer
 * the run panel and `?run=` links open.
 *
 * @param row - Run row.
 * @param repositoryName - Display name of the run's repository.
 * @returns The drawer's run facts.
 * @public
 */
export function toActionDrawerRun(row: IActionRunRow, repositoryName?: string): IActionDrawerRun {
  const local = row.runner !== 'github';
  const sources: IActionDrawerSourceState[] = [
    ...(row.run
      ? [{ kind: 'github' as const, label: 'GitHub' as const, state: row.run.status }]
      : []),
    ...(local
      ? [
          {
            kind: 'local-runner' as const,
            label: 'Local runner' as const,
            state: row.runningLocally ? 'in-progress' : (row.localExecution?.state ?? row.status),
          },
        ]
      : []),
  ];
  const ciRunId = row.run?.id ?? row.localExecution?.ciRunId;
  return {
    kind: local ? 'local-action' : 'cloud-action',
    sourceLabel: !local ? 'GitHub' : row.run ? 'Action' : 'Local runner',
    sources,
    title: row.workflowName,
    message: [row.branch, row.revision].filter(Boolean).join(' · ') || repositoryName || '',
    state: row.status,
    startedAt: row.startedAt ?? row.finishedAt ?? '',
    ...(row.finishedAt ? { finishedAt: row.finishedAt } : {}),
    active: row.status === 'in-progress',
    ...(ciRunId ? { ciRunId } : {}),
    ...((row.run?.runAttempt ?? row.localExecution?.runAttempt)
      ? { runAttempt: row.run?.runAttempt ?? row.localExecution?.runAttempt }
      : {}),
    ...(row.run?.externalUrl ? { externalUrl: row.run.externalUrl } : {}),
    ...(row.localExecution?.failureLog ? { failureLog: row.localExecution.failureLog } : {}),
    ...(row.localExecution?.localDiagnostics
      ? { localDiagnostics: row.localExecution.localDiagnostics }
      : {}),
  };
}
