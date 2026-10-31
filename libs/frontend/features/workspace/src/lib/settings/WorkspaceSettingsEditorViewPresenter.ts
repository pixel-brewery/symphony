// #region Imports

import { inject, Injectable, signal } from '@angular/core';
import { DRAWER_REF, DRAWER_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import type { IWorkspaceSettingsEditorRequest } from './IWorkspaceSettingsEditorRequest';

// #endregion

/**
 * Owns Workspace's create and edit form while retaining the single validated settings writer.
 *
 * @public
 */
@Injectable()
export class WorkspaceSettingsEditorViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(WORKSPACE_SETTINGS_CONTEXT);
  private readonly _configuration = inject(WORKSPACE_CONFIGURATION);
  private readonly _drawer = inject(DRAWER_REF);
  private readonly _busy = signal(false);
  /**
   * Validated feature-specific editor request.
   *
   * @public
   * @readonly
   */
  public readonly data = inject<IWorkspaceSettingsEditorRequest>(DRAWER_REF_DATA);
  /**
   * Existing global exclusion between settings operations.
   *
   * @public
   * @readonly
   */
  public readonly editorBusy = this._context.editorBusy;
  /**
   * Local save lifecycle; the aggregate writer remains the persistence owner.
   *
   * @public
   * @readonly
   */
  public readonly busy = this._busy.asReadonly();
  /**
   * Mutable form draft retained for the drawer lifetime.
   *
   * @public
   */
  public workspace = this.createDraft();
  /**
   * Closes without writing the draft.
   *
   * @public
   * @readonly
   */
  public readonly closeCommand = new Command<void>(() => this._drawer.close());
  /**
   * Saves a valid form, preserving other configured workspace settings.
   *
   * @public
   * @readonly
   */
  public readonly saveCommand = new Command<void>(() => {
    void this.save();
  });

  // #endregion

  // #region Methods

  /**
   * Hydrates only Workspace's actual configuration dependency when necessary.
   *
   * @public
   */
  public override async onHydrate(): Promise<void> {
    if (!this._context.settings()) {
      await this._configuration.refreshConfiguration();
      this.workspace = this.createDraft();
    }
  }

  private createDraft() {
    const workspace = this._context
      .settings()
      ?.workspaces.find((item) => item.id === this.data.workspaceId);
    return {
      displayName: workspace?.displayName ?? '',
      shortCode: workspace?.shortCode ?? '',
      color: workspace?.color ?? '#4f6bed',
      enabled: workspace?.enabled ?? true,
    };
  }

  private async save(): Promise<void> {
    if (this._busy() || this.editorBusy()) return;
    const current = this._context.settings();
    if (!current) throw new Error('Application settings are not loaded.');
    const displayName = this.workspace.displayName.trim();
    const shortCode = this.workspace.shortCode.trim().toLocaleUpperCase().slice(0, 8);
    if (!displayName || !shortCode || !/^#[0-9a-fA-F]{6}$/u.test(this.workspace.color)) return;
    const id = this.data.workspaceId ?? `workspace-${crypto.randomUUID()}`;
    const stored = current.workspaces.find((candidate) => candidate.id === id);
    const workspace: ApplicationSettingsDto['workspaces'][number] = {
      id,
      displayName,
      shortCode,
      color: this.workspace.color,
      enabled: this.workspace.enabled,
      isolation: 'strict',
      storageLimitGiB: stored?.storageLimitGiB ?? 20,
      localCiEnabled: stored?.localCiEnabled ?? false,
      automaticDeliveryGroupingEnabled: stored?.automaticDeliveryGroupingEnabled ?? false,
      ...(stored?.localCiImage ? { localCiImage: stored.localCiImage } : {}),
    };
    const workspaces = stored
      ? current.workspaces.map((item) => (item.id === id ? workspace : item))
      : [...current.workspaces, workspace];
    const workspaceIds = current.activeViewScope.workspaceIds.length
      ? current.activeViewScope.workspaceIds
      : [id];
    this._busy.set(true);
    try {
      if (
        await this._configuration.saveSettings({
          ...current,
          workspaces,
          activeViewScope: { ...current.activeViewScope, workspaceIds },
        })
      )
        this._drawer.close();
    } finally {
      this._busy.set(false);
    }
  }

  // #endregion
}
