// #region Imports

import type { InboxOption } from './InboxOption';

// #endregion

/**
 * Whether a continuation accepts delivered work: the gate decision that advances, or the
 * approval of a delegated goal.
 *
 * @param option - The continuation.
 * @returns Whether it accepts.
 * @public
 */
export function isAcceptanceOption(option: InboxOption): boolean {
  return (
    (option.kind === 'decide' && option.effect === 'advance') ||
    (option.kind === 'review-goal' && option.decision === 'approved')
  );
}
