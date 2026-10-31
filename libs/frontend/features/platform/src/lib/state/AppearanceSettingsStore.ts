// #region Imports

import { inject, Injectable } from '@angular/core';
import { Command } from '@symphony/frontend-core';
import { createImmediateSetting, mosaikEventValue } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';

// #endregion

type Theme = ApplicationSettingsDto['user']['theme'];

/**
 * Owns the colour theme setting of Appearance. The theme applies as soon as it is chosen; a
 * failed save restores the previous choice.
 *
 * @public
 */
@Injectable()
export class AppearanceSettingsStore {
  // #region Fields

  private readonly _context = inject(PLATFORM_SETTINGS_CONTEXT);
  private readonly _theme = createImmediateSetting<Theme>(
    () => this._context.settings()?.user.theme ?? 'system',
  );

  /**
   * The chosen theme.
   *
   * @public
   * @readonly
   */
  public readonly theme = this._theme.value;

  /**
   * Applies a theme from a value or a Mosaik selection event.
   *
   * @public
   * @readonly
   */
  public readonly updateThemeCommand = new Command<unknown>((event) => {
    const value = mosaikEventValue(event);
    if (value === 'light' || value === 'dark' || value === 'system') void this.applyTheme(value);
  });

  // #endregion

  // #region Methods

  private applyTheme(theme: Theme): Promise<boolean> {
    return this._theme.apply(theme, async (next) => {
      const current = this._context.settings();
      if (!current) return false;
      return this._context.saveSettings({ ...current, user: { ...current.user, theme: next } });
    });
  }

  // #endregion
}
