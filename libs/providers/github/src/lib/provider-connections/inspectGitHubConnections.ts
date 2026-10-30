// #region Imports

import { inspectAllowedCommand } from '@symphony/providers-core';
import type { IGitHubStatusDocument } from './IGitHubStatusDocument';
import type { IProviderConnectionStatus } from '@symphony/domain-platform';
import { runAllowedCommand } from './runAllowedCommand';

// #endregion

/**
 * Inspects GitHub CLI accounts without invoking any AI provider.
 *
 * @returns Existing safe GitHub account status used by desktop connection settings.
 *
 * @public
 */
export async function inspectGitHubConnections(): Promise<IProviderConnectionStatus['github']> {
  const githubHealth = await inspectAllowedCommand('gh');
  const github: IProviderConnectionStatus['github'] = {
    cliAvailable: githubHealth.available,
    accounts: [],
  };

  if (githubHealth.available) {
    try {
      const result = await runAllowedCommand('gh', ['auth', 'status', '--json', 'hosts']);
      const document = JSON.parse(result.stdout) as IGitHubStatusDocument;

      github.accounts = Object.entries(document.hosts ?? {}).flatMap(([hostname, entries]) =>
        entries
          .filter((entry) => entry.state === 'success' && entry.login)
          .map((entry) => ({
            id: `github:${hostname}:${entry.login}`,
            hostname,
            login: entry.login!,
            active: entry.active === true,
            ...(entry.gitProtocol ? { gitProtocol: entry.gitProtocol } : {}),
            scopes: entry.scopes
              ? entry.scopes
                  .split(',')
                  .map((scope) => scope.trim())
                  .filter(Boolean)
              : [],
          })),
      );
    } catch (cause) {
      github.error = cause instanceof Error ? cause.message : 'Unable to inspect GitHub login.';
    }
  }

  return github;
}
