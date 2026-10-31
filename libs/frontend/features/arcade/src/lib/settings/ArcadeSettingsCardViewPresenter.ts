// #region Imports

import { inject, Injectable, type Signal } from '@angular/core';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { ARCADE_GOD_MODE_STATE } from '../god-mode/ArcadeGodModeStateToken';
import { ARCADE_SETTINGS_CONTEXT } from './ArcadeSettingsContextToken';

// #endregion

/**
 * Owns the optional Arcade card's preference command and session-mode projections.
 *
 * @public
 */
@Injectable()
export class ArcadeSettingsCardViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _context = inject(ARCADE_SETTINGS_CONTEXT);
  private readonly _godMode = inject(ARCADE_GOD_MODE_STATE);
  private readonly _updateArcadeEnabledCommand = new Command<boolean>(
    (enabled) => void this.onExecuteUpdateArcadeEnabledCommand(enabled),
  );

  // #endregion

  // #region Properties

  /**
   * Whether the persisted preference exposes Arcade in navigation.
   *
   * @public
   * @readonly
   */
  public get arcadeEnabled(): Signal<boolean> {
    return this._context.enabled;
  }

  /**
   * Keyboard labels in the session-mode activation sequence.
   *
   * @public
   * @readonly
   */
  public get arcadeGodModeSequence(): readonly string[] {
    return this._godMode.sequence;
  }

  /**
   * Number of accepted keys in the current activation attempt.
   *
   * @public
   * @readonly
   */
  public get arcadeGodModeProgress(): Signal<number> {
    return this._godMode.progress;
  }

  /**
   * Whether session-only Arcade rules have been activated.
   *
   * @public
   * @readonly
   */
  public get arcadeGodModeEnabled(): Signal<boolean> {
    return this._godMode.enabled;
  }

  /**
   * Saves the optional Arcade destination preference.
   *
   * @public
   * @readonly
   */
  public get updateArcadeEnabledCommand(): Command<boolean> {
    return this._updateArcadeEnabledCommand;
  }

  // #endregion

  // #region Methods

  private async onExecuteUpdateArcadeEnabledCommand(enabled: boolean): Promise<void> {
    await this._context.setEnabled(enabled);
  }

  // #endregion
}
