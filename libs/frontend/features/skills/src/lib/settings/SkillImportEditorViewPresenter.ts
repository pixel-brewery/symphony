// #region Imports
import { ApplicationRef, ChangeDetectorRef, inject, Injectable, signal } from '@angular/core';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { SkillStore } from '../catalog/SkillStore';
import type { ISkillImportEditorRequest } from './ISkillImportEditorRequest';
import { SKILL_IMPORT_PATHS } from './SkillImportPathsToken';
import { SKILLS_SETTINGS_CONTEXT } from './SkillsSettingsContextToken';
// #endregion
/** Owns the existing portable package import and sheet lifecycle. @public */
@Injectable()
export class SkillImportEditorViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields
  private readonly _store = inject(SkillStore);
  private readonly _paths = inject(SKILL_IMPORT_PATHS);
  private readonly _dialogRef = inject(DIALOG_REF);
  private readonly _changeDetector = inject(ChangeDetectorRef);
  private readonly _application = inject(ApplicationRef);
  /** The same validated import request that opens this sheet. @public @readonly */
  public readonly data = inject<ISkillImportEditorRequest>(DIALOG_REF_DATA);
  /** The selected portable package directory. @public */
  public importPath = '';
  /** The existing local submit lifecycle. @public @readonly */
  public readonly busy = signal(false);
  /** The existing aggregate Settings exclusion, including Skills and Feedback activity. @public @readonly */
  public readonly editorBusy = inject(SKILLS_SETTINGS_CONTEXT).editorBusy;
  /** Whether the import may be confirmed. @public @readonly */
  public readonly canSave = (): boolean => true;
  private readonly _chooseImportDirectoryCommand = new Command<void>(() => {
    void this.onExecuteChooseImportDirectoryCommand();
  });
  private readonly _saveCommand = new Command<void>(() => {
    void this.onExecuteSaveCommand();
  });
  private readonly _closeCommand = new Command<void>(() => this._dialogRef.close());
  // #endregion
  // #region Properties
  /** Chooses the portable directory through the typed native bridge. @public @readonly */
  public get chooseImportDirectoryCommand() {
    return this._chooseImportDirectoryCommand;
  }
  /** Runs the existing bounded import and closes only on success. @public @readonly */
  public get saveCommand() {
    return this._saveCommand;
  }
  /** Closes the draft without importing it. @public @readonly */
  public get closeCommand() {
    return this._closeCommand;
  }
  // #endregion
  // #region Methods
  /** Preserves the sheet post-hydration render scheduling. @public */
  public override async onHydrate(): Promise<void> {
    window.requestAnimationFrame(() => this._application.tick());
  }
  /**
   * Chooses the import directory.
   *
   * @private
   */
  private async onExecuteChooseImportDirectoryCommand(): Promise<void> {
    const result = await this._paths.selectPath({
      kind: 'directory',
      title: 'Choose portable skill folder',
      defaultPath: this.importPath || undefined,
    });
    if (!result.canceled && result.paths[0]) {
      this.importPath = result.paths[0];
      this._changeDetector.detectChanges();
    }
  }
  private async onExecuteSaveCommand(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.importSkill();
    } finally {
      this.busy.set(false);
    }
  }
  private async importSkill(): Promise<void> {
    if (this.importPath.trim() && (await this._store.importSkill(this.importPath.trim())))
      this._dialogRef.close();
  }
  // #endregion
}
