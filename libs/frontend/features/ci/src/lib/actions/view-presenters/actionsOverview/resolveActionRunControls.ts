// #region Imports

import type { IActionRunControls } from './IActionRunControls';
import type { IActionRunRow } from './IActionRunRow';
import { isActiveRunStatus } from './isActiveRunStatus';

// #endregion

/**
 * Resolves the commands a run row offers.
 *
 * A local start that has no GitHub run yet can be neither stopped nor opened: the runner only
 * knows it under the GitHub run id it receives once the run exists.
 *
 * @param row - Run row.
 * @param localCiEnabled - Whether the run's workspace allows the managed local runner.
 * @param localRunningRunId - The run the local runner is busy with, if any.
 * @returns The available commands.
 * @public
 */
export function resolveActionRunControls(
  row: IActionRunRow,
  localCiEnabled: boolean,
  localRunningRunId: string | undefined,
): IActionRunControls {
  const run = row.run;
  return {
    canViewLog: Boolean(run ?? row.localExecution),
    canStop:
      row.status === 'in-progress' &&
      (row.runningLocally ? Boolean(run) : run?.status === 'in-progress'),
    canCancel: row.status === 'queued' && run?.status === 'queued',
    canRerun: Boolean(run && !isActiveRunStatus(run.status)) && !row.runningLocally,
    canRunLocally: Boolean(run) && localCiEnabled && !localRunningRunId,
    canOpenInGitHub: Boolean(run?.externalUrl),
  };
}
