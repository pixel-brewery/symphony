// #region Imports

import { inject, Injectable } from '@angular/core';
import {
  Cancel,
  DIALOG_REF,
  DIALOG_REF_DATA,
  type IDialogRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import type { ISettingsAlert } from '../alerts/ISettingsAlert';

// #endregion

/**
 * Answers one alert sheet.
 *
 * @public
 */
@Injectable()
export class SettingsAlertSheetViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _sheet = inject(DIALOG_REF) as IDialogRef<ISettingsAlert, boolean>;

  /**
   * The alert being asked.
   *
   * @public
   * @readonly
   */
  public readonly alert = inject<ISettingsAlert>(DIALOG_REF_DATA);

  /**
   * Answers with the primary button.
   *
   * @public
   * @readonly
   */
  public readonly confirmCommand = new Command<void>(() =>
    this._sheet.close(Cancel.positive(true)),
  );

  /**
   * Answers with the secondary button.
   *
   * @public
   * @readonly
   */
  public readonly cancelCommand = new Command<void>(() => this._sheet.close(Cancel.negative()));

  // #endregion
}
