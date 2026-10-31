// #region Imports

import type { WorkflowRuntimeState } from './WorkflowRuntimeState';

// #endregion

/** Runtime states that hold an exclusive claim on the work item. */
export function holdsActiveClaim(state: WorkflowRuntimeState): boolean {
  return state === 'claimed' || state === 'running' || state === 'merge-pending';
}
