// #region Imports

import { inject, Injectable } from '@angular/core';
import { Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';
import { AppearanceSettingsStore } from '../state/AppearanceSettingsStore';

// #endregion

/**
 * Presents Appearance's colour theme, which applies as soon as it is chosen.
 *
 * @public
 */
@Injectable()
export class AppearanceSettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _store = inject(AppearanceSettingsStore);
  private readonly _context = inject(PLATFORM_SETTINGS_CONTEXT);

  /**
   * The chosen theme.
   *
   * @public
   * @readonly
   */
  public readonly theme = this._store.theme;

  /**
   * Applies a theme.
   *
   * @public
   * @readonly
   */
  public readonly updateThemeCommand = this._store.updateThemeCommand;

  // #endregion

  // #region Methods

  /**
   * Hydrates only when authoritative settings have not loaded.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this._context.settings() ? undefined : this._context.refreshConfiguration();
  }

  // #endregion
}
