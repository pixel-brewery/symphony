// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type { INotificationItem, INotificationSource } from '@symphony/frontend-notification';
import { AI_RUNTIME_LABELS } from '@symphony/frontend-ui';
import { AiStore } from '../state/AiStore';
import { labelLocale, translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const ITEM_PREFIX = 'ai-account:';

const listFormat = (): Intl.ListFormat =>
  new Intl.ListFormat(labelLocale(), { style: 'long', type: 'conjunction' });

/**
 * Reports connected AI accounts whose sign-in has expired or never completed. Accounts whose CLI
 * is missing are left to the developer-tools notification, which names them already. The fix
 * opens the workspace's `Connected services`, where the account's sign-in runs.
 *
 * @public
 */
@Injectable()
export class AiAccountNotificationSource implements INotificationSource {
  // #region Fields

  private readonly _store = inject(AiStore);
  private readonly _desktop = inject(DESKTOP_CLIENT);

  /**
   * One item per signed-out Codex or Claude Code account of an enabled workspace.
   *
   * @public
   * @readonly
   */
  public readonly items = computed<readonly INotificationItem[]>(() => {
    const settings = this._store.settings();
    const status = this._store.connections();
    if (!settings || !status) return [];
    const workspaces = new Map(
      settings.workspaces
        .filter((workspace) => workspace.enabled)
        .map((workspace) => [workspace.id, workspace.displayName]),
    );
    return settings.connections.flatMap((connection): INotificationItem[] => {
      const workspaceName = workspaces.get(connection.workspaceId);
      if (!workspaceName || (connection.kind !== 'codex' && connection.kind !== 'claude')) {
        return [];
      }
      const provider = status[connection.kind];
      const account = provider.accounts.find((candidate) => candidate.id === connection.id);
      if (!provider.cliAvailable || !account || account.authenticated) return [];
      const label = AI_RUNTIME_LABELS[connection.kind];
      const policyIds = new Set(
        settings.agentRoutePolicies
          .filter((policy) =>
            policy.candidates.some(
              (candidate) => candidate.enabled && candidate.aiConnectionId === connection.id,
            ),
          )
          .map((policy) => policy.id),
      );
      const agents = settings.agentProfiles
        .filter((profile) => profile.enabled && policyIds.has(profile.routePolicyId))
        .map((profile) => profile.displayName);
      return [
        {
          id: `${ITEM_PREFIX}${connection.id}`,
          severity: 'warning',
          get title() {
            return /\baccount\b/iu.test(connection.displayName)
              ? translateLabel(
                  'loc.symphony.labels.is.not.signed.in.f4c9655',
                  connection.displayName,
                )
              : connection.displayName === label
                ? translateLabel('loc.symphony.labels.account.is.not.signed.in.3487eec', label)
                : translateLabel(
                    'loc.symphony.labels.account.is.not.signed.in.9e21465',
                    label,
                    connection.displayName,
                  );
          },
          location: [workspaceName, 'Connected services'],
          ...(agents.length
            ? {
                get detail() {
                  return agents.length === 1
                    ? translateLabel(
                        'loc.symphony.labels.runs.on.this.account.1c72b96',
                        listFormat().format(agents),
                      )
                    : translateLabel(
                        'loc.symphony.labels.run.on.this.account.69c4c6b',
                        listFormat().format(agents),
                      );
                },
              }
            : {}),
          scope: { kind: 'workspace', workspaceId: connection.workspaceId, name: workspaceName },
          actions: [
            {
              id: 'sign-in',
              get label() {
                return translateLabel('loc.symphony.labels.sign.in.bfd402b');
              },
              emphasis: 'secondary',
            },
          ],
        },
      ];
    });
  });

  // #endregion

  // #region Methods

  /**
   * Reads the AI accounts' sign-in state again.
   *
   * @public
   */
  public async refresh(): Promise<void> {
    await this._store.refreshProviderConnections();
  }

  /**
   * Opens `Connected services` of the account's workspace in Settings.
   *
   * @param itemId - Identifier of a signed-out account item.
   * @param actionId - `sign-in`.
   * @public
   */
  public async perform(itemId: string, actionId: string): Promise<void> {
    if (actionId !== 'sign-in') return;
    const accountId = itemId.slice(ITEM_PREFIX.length);
    const workspaceId = this._store
      .settings()
      ?.connections.find((connection) => connection.id === accountId)?.workspaceId;
    await this._desktop.request('settings.open', {
      parameters: { ...(workspaceId ? { workspace: workspaceId } : {}), section: 'services' },
    });
  }

  // #endregion
}
