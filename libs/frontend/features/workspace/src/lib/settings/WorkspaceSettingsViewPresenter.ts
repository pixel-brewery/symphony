// #region Imports

import { computed, effect, inject, Injectable, signal, type WritableSignal } from '@angular/core';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import { Command } from '@symphony/frontend-core';
import {
  mosaikEventValue,
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsEditorService,
  SettingsHostSession,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import { WORKSPACE_PATH_SELECTOR } from '../ports/WorkspacePathSelectorToken';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { WorkspaceSelectionStore } from '../state/WorkspaceSelectionStore';
import { WorkspaceStore } from '../state/WorkspaceStore';

// #endregion

type Workspace = ApplicationSettingsDto['workspaces'][number];
interface IWorkspaceSettingsDraft {
  settings: ApplicationSettingsDto | undefined;
  readonly storageLimits: WritableSignal<Readonly<Record<string, number>>>;
}
const DRAFTS = new WeakMap<SettingsHostSession, IWorkspaceSettingsDraft>();

/**
 * Owns Workspace's directory and administration actions through consumed state and the one settings writer.
 *
 * @public
 */
@Injectable()
export class WorkspaceSettingsViewPresenter {
  // #region Fields

  private readonly _context = inject(WORKSPACE_SETTINGS_CONTEXT);
  private readonly _configuration = inject(WORKSPACE_CONFIGURATION);
  private readonly _paths = inject(WORKSPACE_PATH_SELECTOR);
  private readonly _messages = inject(MessageBoxService);
  private readonly _editors = inject(SettingsEditorService);
  private readonly _session = inject(SettingsHostSession);
  private readonly _selection = inject(SETTINGS_WORKSPACE_CONTEXT, { optional: true });
  private readonly _scope = inject(WorkspaceSelectionStore);
  private readonly _draft: IWorkspaceSettingsDraft;
  /**
   * Feature-owned management busy state.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(WorkspaceStore);
  /**
   * Shared writer exclusion without a second writable flag.
   *
   * @public
   * @readonly
   */
  public readonly configurationBusy = this._context.configurationBusy;
  /**
   * Configured workspaces in their existing order.
   *
   * @public
   * @readonly
   */
  public readonly workspaces = computed(() => this._context.settings()?.workspaces ?? []);
  /**
   * Workspace selected by the host, independent of active execution scope.
   *
   * @public
   * @readonly
   */
  public readonly workspace = computed(() =>
    this.workspaces().find(
      (item) => item.id === (this._selection?.workspaceId() ?? this._session.workspaceId()),
    ),
  );
  /**
   * Selected workspace's current measured allocation.
   *
   * @public
   * @readonly
   */
  public readonly storage = computed(() =>
    this._context
      .storageStatus()
      ?.workspaces.find((item) => item.workspaceId === this.workspace()?.id),
  );
  /**
   * Whether allocation is backed by a completed measurement.
   *
   * @public
   * @readonly
   */
  public readonly storageMeasured = computed(
    () => this._context.storageStatus()?.measured ?? false,
  );
  /**
   * Selected workspace's retained, unsaved storage limit.
   *
   * @public
   * @readonly
   */
  public readonly storageLimit = computed(
    () => this._draft.storageLimits()[this.workspace()?.id ?? ''] ?? 20,
  );
  /**
   * Opens an existing workspace's Settings.
   *
   * @public
   * @readonly
   */
  public readonly openSettingsWorkspaceCommand = new Command<string>((id) => {
    if (this.workspaces().some((workspace) => workspace.id === id)) this._session.openWorkspace(id);
  });
  /**
   * Opens the feature-owned Workspace editor.
   *
   * @public
   * @readonly
   */
  public readonly openWorkspaceCommand = new Command<string | undefined>((workspaceId) => {
    void this._editors.open({ kind: 'workspace', workspaceId });
  });
  /**
   * Chooses and confirms a portable workspace import.
   *
   * @public
   * @readonly
   */
  public readonly chooseWorkspaceImportCommand = new Command<void>(() => {
    void this.importWorkspace();
  });
  /**
   * Chooses a workspace's portable export destination.
   *
   * @public
   * @readonly
   */
  public readonly chooseWorkspaceExportCommand = new Command<Workspace>((workspace) => {
    void this.exportWorkspace(workspace);
  });
  /**
   * Confirms the existing destructive workspace operation.
   *
   * @public
   * @readonly
   */
  public readonly confirmDeleteWorkspaceCommand = new Command<Workspace>((workspace) =>
    this.confirmDelete(workspace),
  );
  /**
   * Changes active application scope only on explicit user action.
   *
   * @public
   * @readonly
   */
  public readonly focusWorkspaceCommand = new Command<string>((id) => {
    void this._scope.selectWorkspaceScope(id);
  });
  /**
   * Updates the unsaved selected workspace limit.
   *
   * @public
   * @readonly
   */
  public readonly updateWorkspaceStorageLimitCommand = new Command<unknown>((event) => {
    const id = this.workspace()?.id;
    const value = Number(mosaikEventValue(event));
    if (id && Number.isFinite(value))
      this._draft.storageLimits.update((current) => ({ ...current, [id]: value }));
  });
  /**
   * Persists only the requested limit against the current complete settings.
   *
   * @public
   * @readonly
   */
  public readonly saveWorkspaceStorageLimitCommand = new Command<void>(() => {
    void this.saveStorageLimit();
  });

  /** Updates the existing workspace grouping opt-in through one command. @public @readonly */
  public readonly setAutomaticDeliveryGroupingCommand = new Command<
    readonly [workspaceId: string, enabled: boolean]
  >(([workspaceId, enabled]) => void this.setAutomaticDeliveryGrouping(workspaceId, enabled));

  // #endregion

  // #region Ctor

  /**
   * Retains section drafts for the lifetime of the owning Settings route.
   *
   * @public
   */
  public constructor() {
    let draft = DRAFTS.get(this._session);
    if (!draft) {
      draft = { settings: undefined, storageLimits: signal<Readonly<Record<string, number>>>({}) };
      DRAFTS.set(this._session, draft);
    }
    this._draft = draft;
    effect(() => {
      const settings = this._context.settings();
      if (settings && settings !== this._draft.settings) {
        this._draft.settings = settings;
        this._draft.storageLimits.set(
          Object.fromEntries(
            settings.workspaces.map((workspace) => [workspace.id, workspace.storageLimitGiB]),
          ),
        );
      }
    });
  }

  // #endregion

  // #region Methods

  /**
   * Saves the existing opt-in without reacting to Mosaik's persisted checked event.
   *
   * @private
   */
  private async setAutomaticDeliveryGrouping(workspaceId: string, enabled: boolean): Promise<void> {
    if (this.configurationBusy()) return;
    const current = this.requireSettings();
    const workspace = current.workspaces.find((item) => item.id === workspaceId);
    if (!workspace || workspace.automaticDeliveryGroupingEnabled === enabled) return;
    await this._configuration.saveSettings({
      ...current,
      workspaces: current.workspaces.map((item) =>
        item.id === workspaceId ? { ...item, automaticDeliveryGroupingEnabled: enabled } : item,
      ),
    });
  }

  private async saveStorageLimit(): Promise<void> {
    const workspaceId = this.workspace()?.id;
    if (!workspaceId) return;
    const current = this.requireSettings();
    const storageLimitGiB = this.storageLimit();
    await this._configuration.saveSettings({
      ...current,
      workspaces: current.workspaces.map((item) =>
        item.id === workspaceId ? { ...item, storageLimitGiB } : item,
      ),
    });
  }

  private confirmDelete(workspace: Workspace): void {
    const confirmation = this._messages.show({
      id: `delete-workspace-confirmation-${workspace.id}`,
      header: `Delete ${workspace.displayName}?`,
      message:
        'This permanently removes its connections, execution history, managed worktrees, and isolated AI account data. Configured repository checkouts are kept.',
      buttons: 'yesNo',
      variant: 'danger',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Delete workspace', noLabel: 'Keep workspace' },
    });
    confirmation.closed.subscribe((result) => {
      if (result?.reason === 'positive') void this.store.deleteWorkspace(workspace.id);
    });
  }

  private async importWorkspace(): Promise<void> {
    const result = await this._paths.selectPath({
      kind: 'file',
      title: 'Choose Symphony workspace bundle',
      filters: [{ name: 'Symphony workspace bundle', extensions: ['json'] }],
    });
    const sourcePath = result.paths[0];
    if (result.canceled || !sourcePath) return;
    const confirmation = this._messages.show({
      id: 'workspace-import-confirmation',
      header: 'Import workspace configuration?',
      message:
        'A matching workspace is replaced with the portable configuration. Secrets, signed-in accounts, and local repository paths are never read from the bundle.',
      buttons: 'yesNo',
      variant: 'primary',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Import workspace', noLabel: 'Cancel' },
    });
    confirmation.closed.subscribe((decision) => {
      if (decision?.reason === 'positive') void this.store.importWorkspace(sourcePath);
    });
  }

  private async exportWorkspace(workspace: Workspace): Promise<void> {
    const result = await this._paths.selectPath({
      kind: 'directory',
      title: `Choose export destination for ${workspace.displayName}`,
    });
    const destinationRoot = result.paths[0];
    if (!result.canceled && destinationRoot)
      await this.store.exportWorkspace(workspace.id, destinationRoot);
  }

  private requireSettings(): ApplicationSettingsDto {
    const settings = this._context.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }

  // #endregion
}
