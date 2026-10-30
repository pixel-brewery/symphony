// #region Imports

import type { DeterministicCheck } from './DeterministicCheck';

// #endregion

/**
 * The instruction a repair round hands to the agent. The worktree still holds the accepted
 * implementation, so the request must scope the agent to the rejected checks instead of the
 * original task - a repair told to implement again rewrites work that already passed its scope
 * contract. The operator's own words are restated so a revision's intent survives the rounds.
 */
export function verificationRepairRequest(
  checks: readonly DeterministicCheck[],
  feedback: string | undefined,
): string {
  const failed = checks
    .filter((check) => check.state === 'failed')
    .map(
      (check) =>
        `## ${check.label}\n\n${check.output ?? check.detail ?? 'The check failed without recorded output.'}`,
    );
  return [
    'Your implementation is already present in this workspace and its scope was accepted. Repair only what the repository verification below rejected, keep the existing changes, and do not restart the implementation.',
    ...(feedback ? [`The original request was:\n\n${feedback}`] : []),
    `Failing repository verification:\n\n${failed.join('\n\n')}`,
  ].join('\n\n');
}
