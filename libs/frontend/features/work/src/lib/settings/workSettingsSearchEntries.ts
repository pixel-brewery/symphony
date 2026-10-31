// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import { workSourceOrigin } from './workSourceOrigin';

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
              group: 'Boards',
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
              description:
                account.kind === 'azure-devops'
                  ? `Azure DevOps · ${account.organization}`
                  : `GitHub · ${account.hostname}${account.accountLogin ? ` · @${account.accountLogin}` : ''}`,
              group: 'Accounts',
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
