// #region Imports

import { inject, Injectable } from '@angular/core';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { createImmediateSetting } from '@symphony/frontend-setting';
import { ARCADE_SETTINGS_CONTEXT } from './ArcadeSettingsContextToken';

// #endregion

/**
 * Applies `Show Arcade` as soon as the switch changes and restores it when saving fails.
 *
 * @public
 */
@Injectable()
export class ArcadeEnabledToggleViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _context = inject(ARCADE_SETTINGS_CONTEXT);

  /**
   * The switch's value.
   *
   * @public
   * @readonly
   */
  public readonly enabled = createImmediateSetting(() => this._context.enabled());

  /**
   * Shows or hides Arcade in the main navigation.
   *
   * @public
   * @readonly
   */
  public readonly setEnabledCommand = new Command<boolean>((enabled) => {
    void this.enabled.apply(enabled, (next) => this._context.setEnabled(next));
  });

  // #endregion
}
