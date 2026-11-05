// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import { workSourceOrigin } from './workSourceOrigin';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * One `Search settings` entry per board and per GitHub or Azure DevOps account in `Connected
 * services`; a board shows whether it is enabled, and every result opens the item's sheet.
 *
 * @returns The entries of every workspace's boards and work accounts.
 * @public
 */
export function workSettingsSearchEntries(): Signal<readonly ISettingsSearchEntry[]> {
  const context = inject(WORK_SOURCE_SETTINGS_CONTEXT);
  return computed(() => {
    const settings = context.settings();
    if (!settings) return [];
    const boards = settings.workItemSources.flatMap((source): ISettingsSearchEntry[] =>
      source.provider === 'simulated'
        ? []
        : [
            {
              id: `board-${source.id}`,
              label: source.displayName,
              description: workSourceOrigin(source),
              get group() {
                return translateLabel('loc.symphony.labels.boards.4fcd39d');
              },
              keywords: [
                'board',
                source.provider === 'azure-devops' ? 'Azure DevOps' : 'GitHub Projects',
              ],
              value: source.enabled ? 'Enabled' : 'Disabled',
              workspaceId: source.workspaceId,
              parameters: { board: source.id },
            },
          ],
    );
    const accounts = settings.connections.flatMap((account): ISettingsSearchEntry[] =>
      account.kind === 'github' || account.kind === 'azure-devops'
        ? [
            {
              id: `account-${account.id}`,
              label: account.displayName,
              get description() {
                return account.kind === 'azure-devops'
                  ? translateLabel('loc.symphony.labels.azure.devops.5f166ac', account.organization)
                  : translateLabel(
                      'loc.symphony.labels.github.a23f449',
                      account.hostname,
                      account.accountLogin ? ` · @${account.accountLogin}` : '',
                    );
              },
              get group() {
                return translateLabel('loc.symphony.labels.accounts.8a7c8b6');
              },
              keywords: [
                'account',
                account.kind === 'azure-devops' ? 'Azure DevOps' : 'GitHub',
                ...(account.kind === 'github' && account.accountLogin
                  ? [account.accountLogin]
                  : []),
              ],
              workspaceId: account.workspaceId,
              parameters: { account: account.id },
            },
          ]
        : [],
    );
    return [...boards, ...accounts];
  });
}
