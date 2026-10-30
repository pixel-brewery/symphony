// #region Imports

import { inject, Injectable, Injector } from '@angular/core';
import type { IAutomationPreparation } from '@symphony/frontend-core/automation';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import { NotificationService } from '@symphony/frontend-notification';

// #endregion

/**
 * Owns unattended repository readiness policy and its one deduplicated warning lifecycle.
 *
 * @public
 */
@Injectable()
export class RepositoryPreparationPolicy implements IAutomationPreparation {
  // #region Fields

  private readonly _configuration = inject(ConfigurationStore);
  private readonly _injector = inject(Injector);
  private readonly _notifications: Pick<NotificationService, 'showWarning'> =
    inject(NotificationService);
  private _repositoryPreparationWarningKey = '';

  // #endregion

  // #region Methods

  /**
   * Returns the unprepared automatic repositories.
   *
   * @param automaticExecutionEnabled - Automatic execution enabled.
   * @public
   */
  public unpreparedAutomaticRepositories(automaticExecutionEnabled?: boolean) {
    const settings = this._configuration.settings();
    const isAutomaticExecutionEnabled =
      automaticExecutionEnabled ??
      Boolean(
        settings?.runtime.automaticExecutionEnabled || settings?.runtime.autonomousExecutionEnabled,
      );
    if (!settings || !isAutomaticExecutionEnabled) return [];

    const automatedWorkspaceIds = new Set(
      settings.workItemSources
        .filter((source) => source.enabled)
        .map((source) => source.workspaceId),
    );
    const repositoryRuntime = this._injector.get(REPOSITORY_RUNTIME_OPERATIONS, null);
    if (!repositoryRuntime) return [];
    const statuses = new Map(
      repositoryRuntime
        .repositoryRuntimeStatuses()
        .map((status) => [status.repositoryBindingId, status]),
    );
    return settings.repositoryBindings.filter((repository) => {
      if (!repository.enabled || !automatedWorkspaceIds.has(repository.workspaceId)) return false;
      const status = statuses.get(repository.id);
      return !status || status.preparation.state !== 'prepared';
    });
  }

  /**
   * Reports each current unprepared repository set once after authoritative reconciliation.
   *
   * @public
   */
  public notifyUnpreparedAutomaticExecution(): void {
    const unprepared = this.unpreparedAutomaticRepositories();
    if (!unprepared.length) {
      this._repositoryPreparationWarningKey = '';
      return;
    }
    const warningKey = unprepared
      .map((repository) => repository.id)
      .sort()
      .join('|');
    if (warningKey === this._repositoryPreparationWarningKey) return;
    this._repositoryPreparationWarningKey = warningKey;
    this._notifications.showWarning(
      'Automatic AI work is waiting for local preparation.',
      `${unprepared.map((repository) => repository.displayName).join(', ')}: open Settings and prepare the repository.`,
    );
  }

  // #endregion
}
