// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

/**
 * The instruction an operator-triggered continuation hands to the agent.
 *
 * Only the failed run's recorded error survives a restart - the full check output lives in the
 * run that produced it and is gone - so the continuation names the evidence it still has and
 * relies on the worktree itself to carry the work forward.
 */
export function continuedImplementationRequest(
  failed: IExecutionRecord,
  feedback: string | undefined,
): string {
  return [
    'Your implementation is already present in this workspace. Repair what the previous run left failing, keep the existing changes, and do not restart the implementation.',
    ...(feedback ? [`The operator asks for:\n\n${feedback}`] : []),
    ...(failed.error ? [`The previous run failed with:\n\n${failed.error}`] : []),
  ].join('\n\n');
}
