// #region Imports

import { inject, Injectable } from '@angular/core';
import { Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { SettingsHostSession } from '@symphony/frontend-setting';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';
import { AppearanceSettingsStore } from '../state/AppearanceSettingsStore';

// #endregion

/**
 * Presents the route's appearance draft independently from theme application.
 *
 * @public
 */
@Injectable()
export class AppearanceSettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _draft = inject(AppearanceSettingsStore);
  private readonly _context = inject(PLATFORM_SETTINGS_CONTEXT);
  /**
   * Shared route appearance draft.
   *
   * @public
   * @readonly
   */
  public readonly theme = this._draft.theme;
  /**
   * Updates the draft through the existing event normalization.
   *
   * @public
   * @readonly
   */
  public readonly updateThemeCommand = this._draft.updateThemeCommand;
  /**
   * Saves through the single settings writer.
   *
   * @public
   * @readonly
   */
  public readonly saveThemeCommand = this._draft.saveThemeCommand;

  // #endregion

  // #region Ctor

  /**
   * Joins one Settings route's appearance draft.
   *
   * @public
   */
  public constructor() {
    super();
    this._draft.beginSession(inject(SettingsHostSession));
  }

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
