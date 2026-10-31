// #region Imports

import type { IBoardPullRequestAction } from './IBoardPullRequestAction';
import type { IBoardPullRequestActionOptions } from './IBoardPullRequestActionOptions';
import type { IBoardPullRequestContext } from './IBoardPullRequestContext';

// #endregion

/** The card's pull-request entries: open it, and drive its workflow the way its own page does. */
export function resolveBoardPullRequestActions(
  context: IBoardPullRequestContext,
  options: IBoardPullRequestActionOptions,
): readonly IBoardPullRequestAction[] {
  const run = context.run;
  const remoteRunning = run?.status === 'queued' || run?.status === 'in-progress';
  const locallyRunning = Boolean(run && options.localRunId === run.id);
  const missingRun = run
    ? undefined
    : context.summary
      ? 'No workflow run exists for this branch yet.'
      : 'This pull request is not in the loaded list.';
  const actions: IBoardPullRequestAction[] = [
    {
      id: 'open',
      label: 'Open in GitHub',
      subLabel: `#${context.reference.number}`,
      iconName: 'branch',
      variant: 'default',
      cancels: false,
    },
    {
      id: 'remote',
      label: remoteRunning ? 'Cancel remote run' : 'Run remotely',
      iconName: remoteRunning ? 'clear' : 'cloudArrowRight',
      variant: remoteRunning ? 'danger' : 'highlight',
      cancels: remoteRunning,
      ...(run ? { runId: run.id } : {}),
      ...(missingRun ? { blockedReason: missingRun } : {}),
    },
  ];
  if (options.localCiEnabled) {
    // The local runner takes one run at a time, so another card's run blocks this one - said
    // rather than silently disabled, because the card cannot show whose run it is.
    const busyElsewhere =
      !locallyRunning && options.localRunId
        ? 'The local runner is busy with another run.'
        : undefined;
    actions.push({
      id: 'local',
      label: locallyRunning ? 'Stop local runner' : 'Run locally',
      iconName: locallyRunning ? 'clear' : 'arrowRight',
      variant: locallyRunning ? 'danger' : 'default',
      cancels: locallyRunning,
      ...(run ? { runId: run.id } : {}),
      ...((missingRun ?? busyElsewhere) ? { blockedReason: missingRun ?? busyElsewhere } : {}),
    });
  }
  return actions;
}
