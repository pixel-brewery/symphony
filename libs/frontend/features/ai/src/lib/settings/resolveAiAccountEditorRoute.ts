// #region Imports

import { inject } from '@angular/core';
import { AiStore } from '../state/AiStore';
import type { IAiAccountSettingsEditorRequest } from './IAiAccountSettingsEditorRequest';

// #endregion

/**
 * Resolves `?section=services&account=<id>` to the sheet of that workspace's AI account.
 *
 * @returns The resolver; it answers only for AI accounts, so source-control and work-item accounts
 * stay with their own features.
 * @public
 */
export function resolveAiAccountEditorRoute(): (
  value: string,
  workspaceId: string | undefined,
) => IAiAccountSettingsEditorRequest | undefined {
  const store = inject(AiStore);
  return (connectionId, workspaceId) => {
    const account = store
      .settings()
      ?.connections.find((item) => item.id === connectionId && item.workspaceId === workspaceId);
    return account &&
      (account.kind === 'codex' || account.kind === 'claude' || account.kind === 'opencode')
      ? { kind: 'ai-account', workspaceId: account.workspaceId, connectionId: account.id }
      : undefined;
  };
}
