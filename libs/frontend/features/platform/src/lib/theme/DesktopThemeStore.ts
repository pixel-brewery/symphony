// #region Imports

import { DOCUMENT } from '@angular/common';
import { effect, Inject, inject, Injectable } from '@angular/core';
import { ThemeService } from '@pixel-brewery/mosaik-elements-angular';
import type { IPlatformSettingsContext } from '../ports/IPlatformSettingsContext';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';
import { persistThemePreference } from '@symphony/frontend-core/mobile';

// #endregion

/** Applies the persisted desktop theme independently from orchestration requests. */
@Injectable({ providedIn: 'root' })
export class DesktopThemeStore {
  // #region Fields

  private readonly _window: Window;
  private readonly _themeService: ThemeService;
  private readonly _context: IPlatformSettingsContext;

  // #endregion

  // #region Ctor

  /**
   * Constructs the theme synchronizer for the active renderer window.
   *
   * @public
   */
  public constructor(
    @Inject(DOCUMENT)
    document: Document = inject(DOCUMENT),
    @Inject(ThemeService)
    themeService: ThemeService = inject(ThemeService),
    @Inject(PLATFORM_SETTINGS_CONTEXT)
    context: IPlatformSettingsContext = inject(PLATFORM_SETTINGS_CONTEXT),
  ) {
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Desktop theming requires a browser window.');
    this._window = browserWindow;
    this._themeService = themeService;
    this._context = context;

    effect((cleanup) => {
      const preference = this._context.settings()?.user.theme;
      if (!preference) return;
      const systemTheme = this._window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (): void =>
        this._themeService.applyTheme(
          preference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : preference,
        );
      try {
        persistThemePreference(preference, this._window.localStorage);
      } catch {
        // Applying the selected theme does not depend on preference persistence.
      }
      apply();
      if (preference === 'system') {
        systemTheme.addEventListener('change', apply);
        cleanup(() => systemTheme.removeEventListener('change', apply));
      }
    });
  }

  // #endregion
}
