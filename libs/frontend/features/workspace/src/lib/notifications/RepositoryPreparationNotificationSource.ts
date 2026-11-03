// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { INotificationItem, INotificationSource } from '@symphony/frontend-notification';
import { REPOSITORY_RUNTIME_CLIENT } from '../ports/RepositoryRuntimeClientToken';
import { RepositoryRuntimeStore } from '../state/RepositoryRuntimeStore';

// #endregion

const ITEM_PREFIX = 'repository-preparation:';

/**
 * Reports enabled repositories that are not prepared locally, which AI work in them waits for.
 * Missing copies use the existing preparation command; inspection failures open the affected
 * repository's settings so invalid Git metadata is not treated as an absent checkout.
 *
 * @public
 */
@Injectable()
export class RepositoryPreparationNotificationSource implements INotificationSource {
  // #region Fields

  private readonly _runtime = inject(RepositoryRuntimeStore);
  private readonly _client = inject(REPOSITORY_RUNTIME_CLIENT);
  private readonly _configuration = inject(ConfigurationStore);
  private readonly _router = inject(Router);
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
      const inspectionError = status.preparation.inspectionError;
      return [
        {
          id: `${ITEM_PREFIX}${repository.id}`,
          severity: inspectionError ? 'error' : 'warning',
          title: inspectionError
            ? `${repository.displayName} cannot be inspected locally`
            : `${repository.displayName} is not prepared locally`,
          location: [workspaceName, 'Repositories'],
          detail: inspectionError
            ? `Check Local checkout and its Git metadata. ${inspectionError}`
            : automatic.has(repository.id)
              ? 'automatic AI work waits for it'
              : 'AI work in it waits until it is',
          scope: { kind: 'workspace', workspaceId: repository.workspaceId, name: workspaceName },
          actions: [
            {
              id: inspectionError ? 'open-repository' : 'prepare',
              label: inspectionError ? 'Open repository settings' : 'Prepare locally',
              emphasis: 'secondary',
              busy: !inspectionError && busy === repository.id,
              disabled: !inspectionError && busy !== undefined,
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
   * Prepares an absent repository or opens the failed repository's settings.
   *
   * @param itemId - Identifier of an unprepared-repository item.
   * @param actionId - `prepare` or `open-repository`.
   * @public
   */
  public async perform(itemId: string, actionId: string): Promise<void> {
    if (!itemId.startsWith(ITEM_PREFIX)) return;
    const repositoryId = itemId.slice(ITEM_PREFIX.length);
    const repository = this._configuration
      .settings()
      ?.repositoryBindings.find((candidate) => candidate.id === repositoryId);
    if (!repository) return;
    const item = this.items().find((candidate) => candidate.id === itemId);
    if (!item?.actions.some((action) => action.id === actionId && !action.disabled)) return;
    if (actionId === 'open-repository') {
      await this._router.navigate(['/main/settings'], {
        queryParams: {
          workspace: repository.workspaceId,
          section: 'repositories',
          repository: repositoryId,
        },
      });
    } else if (actionId === 'prepare') {
      await this._runtime.prepareRepository(repositoryId);
    }
  }

  // #endregion
}
