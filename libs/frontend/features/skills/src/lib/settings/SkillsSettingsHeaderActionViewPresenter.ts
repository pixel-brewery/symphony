// #region Imports

import { inject, Injectable } from '@angular/core';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { SettingsEditorService } from '@symphony/frontend-setting';
import { SkillStore } from '../catalog/SkillStore';
import type { ISkillCatalogEditorRequest } from './ISkillCatalogEditorRequest';
import type { ISkillEditorRequest } from './ISkillEditorRequest';
import type { ISkillImportEditorRequest } from './ISkillImportEditorRequest';

// #endregion

/**
 * The toolbar actions of the `Skills` section: refresh, `Import skill`, `Add skills` and
 * `New skill`.
 *
 * @public
 */
@Injectable()
export class SkillsSettingsHeaderActionViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _editors = inject(SettingsEditorService);
  private readonly _store = inject(SkillStore);

  /**
   * Whether a Skills operation is running.
   *
   * @public
   * @readonly
   */
  public readonly skillsBusy = this._store.skillsBusy;

  /**
   * Reloads the installed packages and the built-in roles.
   *
   * @public
   * @readonly
   */
  public readonly refreshSkillsCommand = new Command<void>(() => {
    void this._store.refreshSkills();
  });

  /**
   * Opens the `Import skill` sheet.
   *
   * @public
   * @readonly
   */
  public readonly openSkillImportCommand = new Command<void>(() => {
    const request: ISkillImportEditorRequest = { kind: 'skill-import' };
    void this._editors.open(request);
  });

  /**
   * Opens the `Add skills` sheet.
   *
   * @public
   * @readonly
   */
  public readonly openSkillCatalogCommand = new Command<void>(() => {
    const request: ISkillCatalogEditorRequest = { kind: 'skill-catalog' };
    void this._editors.open(request);
  });

  /**
   * Opens the `New skill` sheet.
   *
   * @public
   * @readonly
   */
  public readonly newSkillCommand = new Command<void>(() => {
    const request: ISkillEditorRequest = { kind: 'skill-editor', mode: 'create' };
    void this._editors.open(request);
  });

  // #endregion
}
