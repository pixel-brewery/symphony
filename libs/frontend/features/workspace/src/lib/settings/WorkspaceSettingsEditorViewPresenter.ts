// #region Imports

import { inject, Injectable, signal } from '@angular/core';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { WorkspaceAvatarPicker } from '../appearance/WorkspaceAvatarPicker';
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
  private readonly _sheet = inject(DIALOG_REF);
  private readonly _avatarPicker = inject(WorkspaceAvatarPicker);
  private readonly _avatarBusy = signal(false);
  private readonly _busy = signal(false);
  private readonly _error = signal<'invalid' | 'save' | undefined>(undefined);
  /**
   * Validated feature-specific editor request.
   *
   * @public
   * @readonly
   */
  public readonly data = inject<IWorkspaceSettingsEditorRequest>(DIALOG_REF_DATA);
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
  /** Whether the icon picker is open. @public @readonly */
  public readonly avatarBusy = this._avatarBusy.asReadonly();
  /**
   * Why the last save did not close the sheet: `invalid` input or a failed `save`.
   *
   * @public
   * @readonly
   */
  public readonly error = this._error.asReadonly();
  /**
   * Mutable form draft retained for the sheet's lifetime, also when saving fails.
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
  public readonly closeCommand = new Command<void>(() => this._sheet.close());
  /** Edits the draft icon and color without writing settings. @public @readonly */
  public readonly chooseAvatarCommand = new Command<void>(() => {
    void this.chooseAvatar();
  });
  /** Refreshes the legacy monogram preview while editing its short code. @public @readonly */
  public readonly setShortCodeCommand = new Command<string>((shortCode) => {
    this.workspace = { ...this.workspace, shortCode };
  });
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
      avatar: workspace?.avatar,
      enabled: workspace?.enabled ?? true,
    };
  }

  private async chooseAvatar(): Promise<void> {
    if (this._busy() || this.editorBusy() || this._avatarBusy()) return;
    this._avatarBusy.set(true);
    try {
      const selection = await this._avatarPicker.pick(this.workspace);
      if (selection) this.workspace = { ...this.workspace, ...selection };
    } finally {
      this._avatarBusy.set(false);
    }
  }

  private async save(): Promise<void> {
    if (this._busy() || this.editorBusy() || this._avatarBusy()) return;
    const current = this._context.settings();
    if (!current) throw new Error('Application settings are not loaded.');
    const displayName = this.workspace.displayName.trim();
    const shortCode = this.workspace.shortCode.trim().toLocaleUpperCase().slice(0, 8);
    if (!displayName || !shortCode || !/^#[0-9a-fA-F]{6}$/u.test(this.workspace.color)) {
      this._error.set('invalid');
      return;
    }
    this._error.set(undefined);
    const id = this.data.workspaceId ?? `workspace-${crypto.randomUUID()}`;
    const stored = current.workspaces.find((candidate) => candidate.id === id);
    const workspace: ApplicationSettingsDto['workspaces'][number] = {
      id,
      displayName,
      shortCode,
      color: this.workspace.color,
      ...(this.workspace.avatar ? { avatar: this.workspace.avatar } : {}),
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
        this._sheet.close();
      else this._error.set('save');
    } finally {
      this._busy.set(false);
    }
  }

  // #endregion
}
