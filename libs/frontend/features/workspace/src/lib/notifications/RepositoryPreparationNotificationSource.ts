// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { INotificationItem, INotificationSource } from '@symphony/frontend-notification';
import { REPOSITORY_RUNTIME_CLIENT } from '../ports/RepositoryRuntimeClientToken';
import { RepositoryRuntimeStore } from '../state/RepositoryRuntimeStore';

// #endregion

const ITEM_PREFIX = 'repository-preparation:';

/**
 * Reports enabled repositories that are not prepared locally, which AI work in them waits for.
 * The fix prepares the repository with the same command as `Repositories` in Settings. This
 * replaces the tray's former `Repository preparation required` row.
 *
 * @public
 */
@Injectable()
export class RepositoryPreparationNotificationSource implements INotificationSource {
  // #region Fields

  private readonly _runtime = inject(RepositoryRuntimeStore);
  private readonly _client = inject(REPOSITORY_RUNTIME_CLIENT);
  private readonly _configuration = inject(ConfigurationStore);
  private readonly _preparation = inject(AUTOMATION_PREPARATION, { optional: true });

  /**
   * One item per enabled repository whose confirmed state is `unprepared`.
   *
   * @public
   * @readonly
   */
  public readonly items = computed<readonly INotificationItem[]>(() => {
    const settings = this._configuration.settings();
    if (!settings) return [];
    const workspaces = new Map(
      settings.workspaces
        .filter((workspace) => workspace.enabled)
        .map((workspace) => [workspace.id, workspace.displayName]),
    );
    const statuses = new Map(
      this._runtime
        .repositoryRuntimeStatuses()
        .map((status) => [status.repositoryBindingId, status]),
    );
    const automatic = new Set(
      this._preparation?.unpreparedAutomaticRepositories().map((repository) => repository.id),
    );
    const busy = this._runtime.repositoryRuntimeBusy();
    return settings.repositoryBindings.flatMap((repository): INotificationItem[] => {
      const workspaceName = workspaces.get(repository.workspaceId);
      const status = statuses.get(repository.id);
      if (!repository.enabled || !workspaceName || status?.preparation.state !== 'unprepared') {
        return [];
      }
      return [
        {
          id: `${ITEM_PREFIX}${repository.id}`,
          severity: 'warning',
          title: `${repository.displayName} is not prepared locally`,
          location: [workspaceName, 'Repositories'],
          detail: automatic.has(repository.id)
            ? 'automatic AI work waits for it'
            : 'AI work in it waits until it is',
          scope: { kind: 'workspace', workspaceId: repository.workspaceId, name: workspaceName },
          actions: [
            {
              id: 'prepare',
              label: 'Prepare locally',
              emphasis: 'secondary',
              busy: busy === repository.id,
              disabled: busy !== undefined,
            },
          ],
        },
      ];
    });
  });

  // #endregion

  // #region Methods

  /**
   * Reads the repositories' local state again without reporting a failure.
   *
   * @public
   */
  public async refresh(): Promise<void> {
    try {
      this._runtime.applyRepositoryRuntimeStatuses(
        await this._client.request('repositories.runtime.list', {}),
      );
    } catch {
      // The last confirmed state stays; Settings reports inspection failures.
    }
  }

  /**
   * Prepares the repository locally.
   *
   * @param itemId - Identifier of an unprepared-repository item.
   * @param actionId - `prepare`.
   * @public
   */
  public async perform(itemId: string, actionId: string): Promise<void> {
    if (actionId !== 'prepare') return;
    await this._runtime.prepareRepository(itemId.slice(ITEM_PREFIX.length));
  }

  // #endregion
}
