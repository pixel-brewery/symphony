// #region Imports

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Inject, inject, Injectable, signal, type Signal } from '@angular/core';
import {
  persistThemePreference,
  readThemePreference,
  resolveThemeMode,
  type ThemePreference,
} from '@symphony/frontend-core/mobile';
import { MOBILE_THEME_APPLIER } from './MobileThemeApplier';

// #endregion

@Injectable({ providedIn: 'root' })
export class MobileThemeStore {
  // #region Fields

  private readonly _document: Document;
  private readonly _window: Window;
  private readonly _destroyRef: DestroyRef;
  private readonly _applyTheme: (mode: ReturnType<typeof resolveThemeMode>) => void;
  private readonly _colorScheme: MediaQueryList;
  private readonly _preference = signal<ThemePreference>('system');
  private _initialized = false;

  // #endregion

  // #region Ctor

  /**
   * Constructs the mobile theme store for the active browser document.
   *
   * @public
   */
  public constructor(
    @Inject(DOCUMENT)
    document: Document = inject(DOCUMENT),
    @Inject(DestroyRef)
    destroyRef: DestroyRef = inject(DestroyRef),
    @Inject(MOBILE_THEME_APPLIER)
    applyTheme: (mode: ReturnType<typeof resolveThemeMode>) => void = inject(MOBILE_THEME_APPLIER),
  ) {
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Mobile theming requires a browser window.');
    this._document = document;
    this._window = browserWindow;
    this._destroyRef = destroyRef;
    this._applyTheme = applyTheme;
    this._colorScheme = browserWindow.matchMedia('(prefers-color-scheme: dark)');
    this._preference.set(this.readPreference());
  }

  // #endregion

  // #region Properties

  /**
   * The preference.
   *
   * @public
   * @readonly
   */
  public get preference(): Signal<ThemePreference> {
    return this._preference.asReadonly();
  }

  // #endregion

  // #region Methods

  /**
   * Initializes.
   *
   * @public
   */
  public initialize(): void {
    if (this._initialized) return;
    this._initialized = true;

    const listener = (): void => {
      if (this._preference() === 'system') this.applyPreference();
    };
    this._colorScheme?.addEventListener('change', listener);
    this._destroyRef.onDestroy(() => this._colorScheme?.removeEventListener('change', listener));
    this.applyPreference();
  }

  /**
   * Sets the preference.
   *
   * @param preference - Preference.
   * @public
   */
  public setPreference(preference: ThemePreference): void {
    this._preference.set(preference);
    try {
      persistThemePreference(preference, this._window.localStorage);
    } catch {
      // The selected theme still applies when browser storage is unavailable.
    }
    this.applyPreference();
  }

  private applyPreference(): void {
    const mode = resolveThemeMode(this._preference(), this._colorScheme.matches);
    this._applyTheme(mode);
    this._document.documentElement.style.colorScheme = mode;

    const background = this._window
      .getComputedStyle(this._document.documentElement)
      .getPropertyValue('--mosaik-scheme-background')
      .trim();
    if (background) {
      this._document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
    }
  }

  private readPreference(): ThemePreference {
    try {
      return readThemePreference(this._window.localStorage) ?? 'system';
    } catch {
      return 'system';
    }
  }

  // #endregion
}
