// #region Imports

import type { IBoardPullRequestAction } from './IBoardPullRequestAction';
import type { IBoardPullRequestActionOptions } from './IBoardPullRequestActionOptions';
import type { IBoardPullRequestContext } from './IBoardPullRequestContext';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
      get label() {
        return translateLabel('loc.symphony.labels.open.in.github.4fb7881');
      },
      subLabel: `#${context.reference.number}`,
      iconName: 'branch',
      variant: 'default',
      cancels: false,
    },
    {
      id: 'remote',
      get label() {
        return remoteRunning
          ? translateLabel('loc.symphony.labels.cancel.remote.run.fd75f5b')
          : translateLabel('loc.symphony.labels.run.remotely.99694b7');
      },
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
      get label() {
        return locallyRunning
          ? translateLabel('loc.symphony.labels.stop.local.runner.fd14eb4')
          : translateLabel('loc.symphony.labels.run.locally.a28ec84');
      },
      iconName: locallyRunning ? 'clear' : 'arrowRight',
      variant: locallyRunning ? 'danger' : 'default',
      cancels: locallyRunning,
      ...(run ? { runId: run.id } : {}),
      ...((missingRun ?? busyElsewhere) ? { blockedReason: missingRun ?? busyElsewhere } : {}),
    });
  }
  return actions;
}
