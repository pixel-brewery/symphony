// #region Imports

import type { WorkflowRuntimeState } from './WorkflowRuntimeState';

// #endregion

/** Runtime states in which no automated run may be started. */
export function isAutomationPaused(state: WorkflowRuntimeState): boolean {
  return (
    state === 'awaiting-human-review' ||
    state === 'blocked' ||
    state === 'human-required' ||
    state === 'quarantined' ||
    state === 'closed'
  );
}
