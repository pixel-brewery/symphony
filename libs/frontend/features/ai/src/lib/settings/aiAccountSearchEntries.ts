// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { AI_RUNTIME_LABELS } from '@symphony/frontend-ui';
import { AiStore } from '../state/AiStore';
import { aiAccountSignIn } from './aiAccountSignIn';

// #endregion

/**
 * One `Search settings` entry per AI account in `Connected services`, with its sign-in state as
 * value; the result opens the account's sheet.
 *
 * @returns The entries of every workspace's AI accounts.
 * @public
 */
export function aiAccountSearchEntries(): Signal<readonly ISettingsSearchEntry[]> {
  const store = inject(AiStore);
  return computed(() =>
    (store.settings()?.connections ?? []).flatMap((account): ISettingsSearchEntry[] => {
      if (account.kind !== 'codex' && account.kind !== 'claude' && account.kind !== 'opencode')
        return [];
      const runtime = AI_RUNTIME_LABELS[account.kind];
      const gateway = account.kind === 'opencode' ? account.gateway?.displayName : undefined;
      const signIn = aiAccountSignIn(account, store.connections());
      return [
        {
          id: `ai-account-${account.id}`,
          label: account.displayName,
          description: `${runtime} account${gateway ? ` · ${gateway}` : ''}`,
          group: 'AI accounts',
          keywords: ['AI account', runtime, ...(gateway ? [gateway] : [])],
          ...(signIn ? { value: signIn } : {}),
          workspaceId: account.workspaceId,
          parameters: { account: account.id },
        },
      ];
    }),
  );
}
