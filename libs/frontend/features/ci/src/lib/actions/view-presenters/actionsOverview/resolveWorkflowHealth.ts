// #region Imports

import type { IActionRunRow } from './IActionRunRow';
import type { WorkflowHealth } from './WorkflowHealth';
import { isActiveRunStatus } from './isActiveRunStatus';
import { runTimestamp } from './runTimestamp';

// #endregion

/**
 * Resolves the dot state of one workflow from its runs. A failure outranks a run in progress,
 * because the failure is what needs the operator.
 *
 * @param rows - Runs of the workflow.
 * @returns The workflow's health.
 * @public
 */
export function resolveWorkflowHealth(rows: readonly IActionRunRow[]): WorkflowHealth {
  const latestFinished = rows
    .filter((row) => !isActiveRunStatus(row.status))
    .reduce<IActionRunRow | undefined>(
      (latest, row) =>
        !latest ||
        (row.finishedAt ?? runTimestamp(row)).localeCompare(
          latest.finishedAt ?? runTimestamp(latest),
        ) > 0
          ? row
          : latest,
      undefined,
    );
  if (latestFinished?.status === 'failed') return 'failing';
  if (rows.some((row) => isActiveRunStatus(row.status))) return 'running';
  if (latestFinished?.status === 'succeeded') return 'passing';
  return 'idle';
}
