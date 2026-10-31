// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { Command } from '@symphony/frontend-core';
import {
  SettingsAlertService,
  SettingsEditorService,
  SettingsHostSession,
} from '@symphony/frontend-setting';
import { WORKSPACE_PATH_SELECTOR } from '../ports/WorkspacePathSelectorToken';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { RepositoryRuntimeStore } from '../state/RepositoryRuntimeStore';
import { WorkspaceStore } from '../state/WorkspaceStore';
import type { IWorkspaceDirectoryEntry } from './IWorkspaceDirectoryEntry';

// #endregion

/** Provider connection kinds that are AI accounts. */
const AI_ACCOUNT_KINDS: ReadonlySet<string> = new Set(['codex', 'claude', 'opencode']);

/**
 * Owns the Settings `Workspaces` list: each workspace with its summary and state, opening a
 * workspace's settings, adding a workspace and importing a portable workspace bundle.
 *
 * @public
 */
@Injectable()
export class WorkspaceDirectoryViewPresenter {
  // #region Fields

  private readonly _context = inject(WORKSPACE_SETTINGS_CONTEXT);
  private readonly _paths = inject(WORKSPACE_PATH_SELECTOR);
  private readonly _alerts = inject(SettingsAlertService);
  private readonly _editors = inject(SettingsEditorService);
  private readonly _session = inject(SettingsHostSession);
  private readonly _repositories = inject(RepositoryRuntimeStore, { optional: true });

  /**
   * Workspace import and export activity.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(WorkspaceStore);

  /**
   * Every workspace with the facts of its summary, in configured order.
   *
   * @public
   * @readonly
   */
  public readonly entries = computed<readonly IWorkspaceDirectoryEntry[]>(() => {
    const settings = this._context.settings();
    if (!settings) return [];
    const storage = this._context.storageStatus();
    const runtime = this._repositories?.repositoryRuntimeStatuses();
    return settings.workspaces.map((workspace) => {
      const repositories = settings.repositoryBindings.filter(
        (repository) => repository.workspaceId === workspace.id,
      );
      return {
        workspace,
        agents: settings.agentProfiles.filter((profile) => profile.workspaceId === workspace.id)
          .length,
        aiAccounts: settings.connections.filter(
          (connection) =>
            connection.workspaceId === workspace.id && AI_ACCOUNT_KINDS.has(connection.kind),
        ).length,
        repositories: repositories.length,
        unpreparedRepositories: runtime
          ? runtime.filter(
              (status) =>
                status.workspaceId === workspace.id && status.preparation.state === 'unprepared',
            ).length
          : undefined,
        storage: storage?.measured
          ? storage.workspaces.find((usage) => usage.workspaceId === workspace.id)
          : undefined,
      };
    });
  });

  /**
   * Workspaces included in configuration and task routing.
   *
   * @public
   * @readonly
   */
  public readonly enabledEntries = computed(() =>
    this.entries().filter((entry) => entry.workspace.enabled),
  );

  /**
   * Disabled workspaces, listed in their own frame.
   *
   * @public
   * @readonly
   */
  public readonly disabledEntries = computed(() =>
    this.entries().filter((entry) => !entry.workspace.enabled),
  );

  /**
   * Opens a workspace's settings on its AI team.
   *
   * @public
   * @readonly
   */
  public readonly openSettingsWorkspaceCommand = new Command<string>((workspaceId) => {
    if (this.entries().some((entry) => entry.workspace.id === workspaceId))
      this._session.openWorkspace(workspaceId);
  });

  /**
   * Opens the `Add workspace` sheet.
   *
   * @public
   * @readonly
   */
  public readonly addWorkspaceCommand = new Command<void>(() => {
    void this._editors.open({ kind: 'workspace' });
  });

  /**
   * Chooses a portable workspace bundle and confirms its import.
   *
   * @public
   * @readonly
   */
  public readonly importWorkspaceCommand = new Command<void>(() => {
    void this.importWorkspace();
  });

  // #endregion

  // #region Methods

  private async importWorkspace(): Promise<void> {
    const result = await this._paths.selectPath({
      kind: 'file',
      title: 'Choose Symphony workspace bundle',
      filters: [{ name: 'Symphony workspace bundle', extensions: ['json'] }],
    });
    const sourcePath = result.paths[0];
    if (result.canceled || !sourcePath) return;
    const confirmed = await this._alerts.confirm({
      id: 'workspace-import',
      header: 'Import workspace configuration?',
      message:
        'A matching workspace is replaced with the portable configuration. Secrets, signed-in accounts, and local repository paths are never read from the bundle.',
      tone: 'info',
      confirmLabel: 'Import workspace',
      cancelLabel: 'Cancel',
    });
    if (confirmed) await this.store.importWorkspace(sourcePath);
  }

  // #endregion
}
