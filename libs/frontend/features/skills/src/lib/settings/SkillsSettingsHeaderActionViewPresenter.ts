// #region Imports
import { inject, Injectable } from '@angular/core';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { SettingsEditorService } from '@symphony/frontend-setting';
// #endregion
/** Dispatches the existing import action through the generic Settings editor owner. @public */
@Injectable()
export class SkillsSettingsHeaderActionViewPresenter extends ViewPresenter {
  // #region Fields
  private readonly _editors = inject(SettingsEditorService);
  /** Opens the same portable import request. @public @readonly */
  public readonly openSkillImportCommand = new Command<void>(() => {
    void this._editors.open({ kind: 'skill-import' });
  });
  // #endregion
}
