// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { Command } from '@symphony/frontend-core';
import {
  createImmediateSetting,
  mosaikEventValue,
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsAlertService,
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

/** Smallest and largest storage limit a workspace accepts, in GB. */
const STORAGE_LIMIT_RANGE = { min: 2, max: 1024 } as const;

/**
 * Owns a workspace's `Administration` section: its storage limit and delivery grouping, which apply
 * as soon as they change, and the edit, scope, export and delete actions.
 *
 * @public
 */
@Injectable()
export class WorkspaceSettingsViewPresenter {
  // #region Fields

  private readonly _context = inject(WORKSPACE_SETTINGS_CONTEXT);
  private readonly _configuration = inject(WORKSPACE_CONFIGURATION);
  private readonly _paths = inject(WORKSPACE_PATH_SELECTOR);
  private readonly _alerts = inject(SettingsAlertService);
  private readonly _editors = inject(SettingsEditorService);
  private readonly _session = inject(SettingsHostSession);
  private readonly _selection = inject(SETTINGS_WORKSPACE_CONTEXT, { optional: true });
  private readonly _scope = inject(WorkspaceSelectionStore);
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
  private readonly _storageLimit = createImmediateSetting(
    () => this.workspace()?.storageLimitGiB ?? 20,
  );
  private readonly _automaticDeliveryGrouping = createImmediateSetting(
    () => this.workspace()?.automaticDeliveryGroupingEnabled ?? false,
  );
  /**
   * Selected workspace's storage limit in GB as the number box shows it: the stored limit, the
   * committed one while it is saved, and the stored one again when saving failed.
   *
   * @public
   * @readonly
   */
  public readonly storageLimit = this._storageLimit.value;
  /**
   * Whether fully compatible tickets of the selected workspace start one shared delivery workflow
   * without a second confirmation, as the switch shows it.
   *
   * @public
   * @readonly
   */
  public readonly automaticDeliveryGrouping = this._automaticDeliveryGrouping.value;
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
   * Chooses a workspace's portable export destination.
   *
   * @public
   * @readonly
   */
  public readonly chooseWorkspaceExportCommand = new Command<Workspace>((workspace) => {
    void this.exportWorkspace(workspace);
  });
  /**
   * Confirms the existing destructive workspace operation in an alert sheet.
   *
   * @public
   * @readonly
   */
  public readonly confirmDeleteWorkspaceCommand = new Command<Workspace>(
    (workspace) => void this.confirmDelete(workspace),
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
   * Saves the selected workspace's storage limit when the number box commits a value between 2
   * and 1024 GB; any other value shows the stored limit again.
   *
   * @public
   * @readonly
   */
  public readonly commitWorkspaceStorageLimitCommand = new Command<unknown>(
    (event) => void this.commitStorageLimit(event),
  );
  /**
   * Saves the workspace's delivery-grouping opt-in as soon as the switch changes.
   *
   * @public
   * @readonly
   */
  public readonly setAutomaticDeliveryGroupingCommand = new Command<
    readonly [workspaceId: string, enabled: boolean]
  >(([workspaceId, enabled]) => void this.setAutomaticDeliveryGrouping(workspaceId, enabled));

  // #endregion

  // #region Methods

  /**
   * Saves the opt-in, ignoring the `checked` event Mosaik reflects when the stored value is bound.
   *
   * @private
   */
  private async setAutomaticDeliveryGrouping(workspaceId: string, enabled: boolean): Promise<void> {
    if (this.configurationBusy() || workspaceId !== this.workspace()?.id) return;
    await this._automaticDeliveryGrouping.apply(enabled, (value) =>
      this.saveWorkspace(workspaceId, { automaticDeliveryGroupingEnabled: value }),
    );
  }

  private async commitStorageLimit(event: unknown): Promise<void> {
    const workspaceId = this.workspace()?.id;
    if (!workspaceId) return;
    const limit = Number(mosaikEventValue(event));
    const valid =
      Number.isInteger(limit) &&
      limit >= STORAGE_LIMIT_RANGE.min &&
      limit <= STORAGE_LIMIT_RANGE.max;
    const next = valid ? limit : (this.workspace()?.storageLimitGiB ?? 20);
    await this._storageLimit.apply(next, (value) =>
      this.saveWorkspace(workspaceId, { storageLimitGiB: value }),
    );
  }

  /**
   * Writes one workspace's changed fields into the latest complete settings.
   *
   * @private
   */
  private async saveWorkspace(
    workspaceId: string,
    changes: Partial<Pick<Workspace, 'storageLimitGiB' | 'automaticDeliveryGroupingEnabled'>>,
  ): Promise<boolean> {
    const current = this.requireSettings();
    return this._configuration.saveSettings({
      ...current,
      workspaces: current.workspaces.map((item) =>
        item.id === workspaceId ? { ...item, ...changes } : item,
      ),
    });
  }

  private async confirmDelete(workspace: Workspace): Promise<void> {
    const confirmed = await this._alerts.confirm({
      id: `delete-workspace-confirmation-${workspace.id}`,
      header: `Delete ${workspace.displayName}?`,
      message:
        'This permanently removes its connections, execution history, managed worktrees, and isolated AI account data. Configured repository checkouts are kept.',
      tone: 'danger',
      confirmLabel: 'Delete workspace',
      cancelLabel: 'Keep workspace',
      destructive: true,
    });
    if (confirmed) await this.store.deleteWorkspace(workspace.id);
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
