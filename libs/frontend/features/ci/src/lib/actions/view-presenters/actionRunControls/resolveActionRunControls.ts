// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IActionRunControls } from './IActionRunControls';

// #endregion

export function resolveActionRunControls(
  run: ICiRun | undefined,
  localCiEnabled: boolean,
  localRunningRunId: string | undefined,
): IActionRunControls {
  const remoteActive = run?.status === 'queued' || run?.status === 'in-progress';
  const runningLocally = Boolean(run && localRunningRunId === run.id);
  return {
    canCancelRemote: Boolean(run && remoteActive),
    canRerunRemote: Boolean(run && !remoteActive),
    canRunLocally: Boolean(run && localCiEnabled && !localRunningRunId),
    canStopLocal: runningLocally,
  };
}
