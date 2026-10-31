// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IPullRequestChecksSummary } from './IPullRequestChecksSummary';

// #endregion

/**
 * Composes the change request the Solver receives when an operator asks AI to repair a pull
 * request's failed checks.
 *
 * @param pullRequest - Pull request.
 * @param checks - Combined state of its checks.
 * @returns The request.
 * @public
 */
export function composePullRequestRepairRequest(
  pullRequest: Pick<IPullRequestSummary, 'number' | 'sourceBranch'>,
  checks: Pick<IPullRequestChecksSummary, 'failingNames'>,
): string {
  const names = checks.failingNames.length ? checks.failingNames.join(', ') : 'the failed checks';
  return [
    `Repair the failed checks of pull request #${pullRequest.number} on ${pullRequest.sourceBranch}: ${names}.`,
    'Read the failure logs, fix the cause on the retained branch and keep the change focused on making these checks pass.',
  ].join('\n\n');
}
