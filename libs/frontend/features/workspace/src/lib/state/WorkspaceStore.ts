// #region Imports

import { Inject, inject, Injectable, Optional, signal, type Signal } from '@angular/core';
import {
  WORKSPACE_REFRESH_PARTICIPANTS,
  type IWorkspaceRefreshParticipant,
} from '@symphony/frontend-core';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import { WORK_SELECTION, type IWorkSelection } from '@symphony/frontend-core/work';
import type { IWorkspaceOperations } from '@symphony/frontend-core/workspace';
import type { IWorkspaceClient } from '../ports/IWorkspaceClient';
import type { IWorkspaceConfiguration } from '../ports/IWorkspaceConfiguration';
import type { IWorkspaceProjection } from '../ports/IWorkspaceProjection';
import type { IWorkspaceRefresh } from '../ports/IWorkspaceRefresh';
import { WORKSPACE_CLIENT } from '../ports/WorkspaceClientToken';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import { WORKSPACE_PROJECTION } from '../ports/WorkspaceProjectionToken';
import { WORKSPACE_REFRESH } from '../ports/WorkspaceRefreshToken';

// #endregion

/**
 * Owns workspace import, export, deletion, cleanup and their operation state.
 *
 * @public
 */
@Injectable()
export class WorkspaceStore implements IWorkspaceOperations {
  // #region Fields

  private readonly _client: IWorkspaceClient;
  private readonly _configuration: IWorkspaceConfiguration;
  private readonly _projection: IWorkspaceProjection;
  private readonly _refresh: IWorkspaceRefresh;
  private readonly _workSelection: IWorkSelection | null;
  private readonly _refreshParticipants: readonly IWorkspaceRefreshParticipant[];
  private readonly _notifications: Pick<
    NotificationService,
    'showError' | 'showWarning' | 'showSuccess' | 'showInfo'
  >;
  private readonly _workspaceCleanupBusy = signal(false);
  private readonly _workspaceDeletionBusy = signal<string | undefined>(undefined);
  private readonly _workspaceTransferBusy = signal<'import' | string | undefined>(undefined);
  private readonly _publicWorkspaceCleanupBusy = this._workspaceCleanupBusy.asReadonly();
  private readonly _publicWorkspaceDeletionBusy = this._workspaceDeletionBusy.asReadonly();
  private readonly _publicWorkspaceTransferBusy = this._workspaceTransferBusy.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Connects the existing validated client and aggregate mutation dependencies.
   *
   * @public
   */
  public constructor(
    @Inject(WORKSPACE_CLIENT) client: IWorkspaceClient = inject(WORKSPACE_CLIENT),
    @Inject(WORKSPACE_CONFIGURATION)
    configuration: IWorkspaceConfiguration = inject(WORKSPACE_CONFIGURATION),
    @Inject(WORKSPACE_PROJECTION) projection: IWorkspaceProjection = inject(WORKSPACE_PROJECTION),
    @Inject(WORKSPACE_REFRESH) refresh: IWorkspaceRefresh = inject(WORKSPACE_REFRESH),
    @Optional()
    @Inject(WORK_SELECTION)
    workSelection: IWorkSelection | null = inject(WORK_SELECTION, { optional: true }),
    @Inject(WORKSPACE_REFRESH_PARTICIPANTS)
    @Optional()
    refreshParticipants: readonly IWorkspaceRefreshParticipant[] | null = inject(
      WORKSPACE_REFRESH_PARTICIPANTS,
      { optional: true },
    ),
    @Inject(NotificationService)
    notifications: Pick<
      NotificationService,
      'showError' | 'showWarning' | 'showSuccess' | 'showInfo'
    > = inject(NotificationService),
  ) {
    this._client = client;
    this._configuration = configuration;
    this._projection = projection;
    this._refresh = refresh;
    this._workSelection = workSelection;
    this._refreshParticipants = refreshParticipants ?? [];
    this._notifications = notifications;
  }

  // #endregion

  // #region Properties

  /**
   * Feature-owned workspaceCleanupBusy state.
   *
   * @public
   * @readonly
   */
  public get workspaceCleanupBusy(): Signal<boolean> {
    return this._publicWorkspaceCleanupBusy;
  }

  /**
   * Feature-owned workspaceDeletionBusy state.
   *
   * @public
   * @readonly
   */
  public get workspaceDeletionBusy(): Signal<string | undefined> {
    return this._publicWorkspaceDeletionBusy;
  }

  /**
   * Feature-owned workspaceTransferBusy state.
   *
   * @public
   * @readonly
   */
  public get workspaceTransferBusy(): Signal<'import' | string | undefined> {
    return this._publicWorkspaceTransferBusy;
  }

  // #endregion

  // #region Methods

  /**
   * Clears the workspaces.
   *
   * @public
   */
  public async clearWorkspaces(): Promise<boolean> {
    if (this._workspaceCleanupBusy()) return false;
    this._workspaceCleanupBusy.set(true);
    try {
      const result = await this._client.request('workspaces.clear', {});
      const details = [
        result.missing ? `${result.missing} already absent` : '',
        result.skipped ? `${result.skipped} active and skipped` : '',
        result.failed ? `${result.failed} could not be removed` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      if (result.failed) {
        this._notifications.showWarning(
          'Workspace cleanup incomplete.',
          `${result.removed} removed${details ? ` · ${details}` : ''}`,
        );
      } else if (result.removed) {
        this._notifications.showSuccess(
          result.removed === 1 ? 'Workspace cleared.' : 'Workspaces cleared.',
          `${result.removed} removed${details ? ` · ${details}` : ''}`,
        );
      } else {
        this._notifications.showInfo('No inactive workspaces to clear.', details);
      }
      return result.failed === 0;
    } catch (cause) {
      this.showError(cause, 'Unable to clear managed workspaces.');
      return false;
    } finally {
      this._workspaceCleanupBusy.set(false);
      await this.refreshStorageStatus(true);
    }
  }

  /**
   * Deletes the workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public async deleteWorkspace(workspaceId: string): Promise<boolean> {
    if (this._workspaceDeletionBusy()) return false;
    this._workspaceDeletionBusy.set(workspaceId);
    try {
      const saved = await this._client.request('workspaces.delete', { workspaceId });
      this._projection.applySettings(saved);
      this._workSelection?.resetId();
      this._configuration.clearProviderConfiguration();
      await Promise.all([
        this._refresh.refresh(),
        this._configuration.refreshConfiguration(),
        ...this._refreshParticipants.map((participant) => participant.refresh()),
      ]);
      this._notifications.showSuccess(
        'Workspace deleted.',
        'Workspace configuration and Symphony-managed local data were removed.',
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to delete the workspace.');
      return false;
    } finally {
      this._workspaceDeletionBusy.set(undefined);
    }
  }

  /**
   * Exports the workspace.
   *
   * @param workspaceId - Workspace id.
   * @param destinationRoot - Destination root.
   * @public
   */
  public async exportWorkspace(workspaceId: string, destinationRoot: string): Promise<boolean> {
    if (this._workspaceTransferBusy()) return false;
    this._workspaceTransferBusy.set(workspaceId);
    try {
      const result = await this._client.request('workspaces.export', {
        workspaceId,
        destinationRoot,
      });
      const skillDetails = result.embeddedSkillCount
        ? ` ${result.embeddedSkillCount} shared skill${result.embeddedSkillCount === 1 ? ' was' : 's were'} included.`
        : '';
      this._notifications.showSuccess(
        `${result.workspaceName} exported.`,
        `Stored credential fields and machine-local paths were excluded.${skillDetails}`,
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to export the workspace.');
      return false;
    } finally {
      this._workspaceTransferBusy.set(undefined);
    }
  }

  /**
   * Imports the workspace.
   *
   * @param sourcePath - Source path.
   * @public
   */
  public async importWorkspace(sourcePath: string): Promise<boolean> {
    if (this._workspaceTransferBusy()) return false;
    this._workspaceTransferBusy.set('import');
    try {
      const result = await this._client.request('workspaces.import', { sourcePath });
      this._projection.applySettings(result.settings);
      this._workSelection?.resetId();
      this._configuration.clearProviderConfiguration();
      await Promise.all([
        this._refresh.refresh(),
        this._configuration.refreshConfiguration(),
        ...this._refreshParticipants.map((participant) => participant.refresh()),
      ]);
      const setup = [
        result.requiredConnectionIds.length
          ? `Sign in to ${result.requiredConnectionIds.length} connection${result.requiredConnectionIds.length === 1 ? '' : 's'}.`
          : '',
        result.repositoryBindingIds.length
          ? `Verify ${result.repositoryBindingIds.length} local repository path${result.repositoryBindingIds.length === 1 ? '' : 's'}.`
          : '',
        result.importedSkillCount
          ? `${result.importedSkillCount} shared skill${result.importedSkillCount === 1 ? ' was' : 's were'} imported.`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
      this._notifications.showSuccess(
        result.replaced
          ? `${result.workspaceName} updated from bundle.`
          : `${result.workspaceName} imported.`,
        setup || 'The workspace is ready to use.',
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to import the workspace.');
      return false;
    } finally {
      this._workspaceTransferBusy.set(undefined);
    }
  }

  private async refreshStorageStatus(silent: boolean): Promise<void> {
    try {
      this._projection.updateStorageStatus(await this._client.request('storage.status.get', {}));
    } catch (cause) {
      if (!silent) this.showError(cause, 'Unable to load storage status.');
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}
