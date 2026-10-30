// #region Imports

import type { IApplicationSettings, ProviderConnection } from '@symphony/configuration-composition';

// #endregion

type GitHubConnection = Extract<ProviderConnection, { readonly kind: 'github' }>;

/**
 * Resolves the account identity of one GitHub connection. Legacy workspaces did not persist the
 * login; a user-owned GitHub Project still provides an unambiguous account without relying on
 * whichever `gh` account happened to be active after another workspace was used.
 *
 * @param settings - Current application settings.
 * @param connection - GitHub connection.
 * @public
 */
export function githubConnectionAccountLogin(
  settings: Pick<IApplicationSettings, 'workItemSources'>,
  connection: GitHubConnection,
): string | undefined {
  const configured = connection.accountLogin?.trim();
  if (configured) return configured;
  const owners = new Map<string, string>();
  for (const source of settings.workItemSources) {
    if (
      source.provider !== 'github-projects' ||
      source.connectionId !== connection.id ||
      source.ownerType !== 'user'
    ) {
      continue;
    }
    const owner = source.owner.trim();
    if (owner) owners.set(owner.toLowerCase(), owner);
  }
  return owners.size === 1 ? [...owners.values()][0] : undefined;
}
