// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { pullRequestStateLabel, pullRequestStateOf } from '@symphony/frontend-core/delivery';
import { scorePaletteMatch, type IPaletteResult } from '@symphony/frontend-search';

// #endregion

/** Pull requests the palette lists at most; the palette cuts the group to the same size. */
const RESULT_LIMIT = 5;

/** Words `Sync now` is found by besides its label. */
const SYNC_KEYWORDS = ['refresh', 'github', 'synchronize', 'update', 'pull requests', 'actions'];

/**
 * Projects Delivery's command palette rows: the pull requests matching the query, open ones first,
 * each with its state and how its checks stand, and `Sync now`, which refreshes the pull requests
 * and the GitHub Actions runs like the status bar's sync.
 *
 * @param pullRequests - Pull requests of the current projection.
 * @param ciRuns - Action runs used to summarise each open pull request's checks.
 * @param normalizedQuery - Locale-lowercased palette input; empty lists only the command.
 * @param sync - Starts the GitHub sync; absent when Delivery cannot refresh.
 * @returns The matching rows.
 * @public
 */
export function projectDeliveryPaletteResults(
  pullRequests: readonly IPullRequestSummary[],
  ciRuns: readonly ICiRun[],
  normalizedQuery: string,
  sync?: () => Promise<unknown>,
): readonly IPaletteResult[] {
  const syncNow: IPaletteResult | undefined = sync && {
    id: 'command:sync-now',
    group: 'commands',
    icon: 'sync',
    title: 'Sync now',
    rank: normalizedQuery ? scorePaletteMatch(normalizedQuery, ['Sync now'], SYNC_KEYWORDS) : 0,
    action: { kind: 'execute', execute: sync },
  };
  const command = syncNow && (!normalizedQuery || syncNow.rank > 0) ? [syncNow] : [];
  if (!normalizedQuery) return command;
  const matches = pullRequests
    .map((pullRequest) => {
      const rank = scorePaletteMatch(
        normalizedQuery,
        [`#${pullRequest.number}`, pullRequest.title],
        [
          pullRequest.author,
          pullRequest.sourceBranch,
          pullRequest.targetBranch,
          pullRequestStateLabel(pullRequestStateOf(pullRequest)),
        ],
      );
      // An open pull request outranks a merged or closed one that matches equally.
      return { pullRequest, rank: rank > 0 && pullRequest.state === 'open' ? rank + 1 : rank };
    })
    .filter((match) => match.rank > 0)
    .toSorted((left, right) => right.rank - left.rank)
    .slice(0, RESULT_LIMIT);
  return [
    ...matches.map(({ pullRequest, rank }): IPaletteResult => ({
      id: `pull-request:${pullRequest.id}`,
      group: 'pull-requests',
      icon: 'branch',
      reference: `#${pullRequest.number}`,
      title: pullRequest.title,
      facts: [
        pullRequestStateLabel(pullRequestStateOf(pullRequest)),
        ...(pullRequest.state === 'open' ? checksFact(pullRequest, ciRuns) : []),
      ],
      rank,
      action: {
        kind: 'navigate',
        path: '/main/pull-requests',
        queryParams: { q: String(pullRequest.number) },
      },
    })),
    ...command,
  ];
}

/** How the latest run of every workflow on the pull request's branch stands, if any ran. */
function checksFact(pullRequest: IPullRequestSummary, ciRuns: readonly ICiRun[]): string[] {
  const latest = new Map<string, ICiRun>();
  for (const run of ciRuns) {
    if (
      run.repositoryBindingId !== pullRequest.repositoryBindingId ||
      run.branch !== pullRequest.sourceBranch
    )
      continue;
    const key = run.workflowId ?? run.name;
    const current = latest.get(key);
    if (!current || startedAt(current) < startedAt(run)) latest.set(key, run);
  }
  const runs = [...latest.values()];
  if (runs.length === 0) return [];
  const failing = runs.filter((run) => run.status === 'failed').length;
  if (failing === 1) return ['1 check failing'];
  if (failing > 1) return [`${failing} checks failing`];
  if (runs.some((run) => run.status === 'in-progress' || run.status === 'queued'))
    return ['checks running'];
  return runs.every((run) => run.status === 'succeeded') ? ['checks passing'] : [];
}

function startedAt(run: ICiRun): string {
  return run.startedAt ?? run.finishedAt ?? '';
}
