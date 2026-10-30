// #region Imports

import { effect, inject, Injectable, signal } from '@angular/core';
import { Command } from '@symphony/frontend-core';
import { mosaikEventValue, type SettingsHostSession } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';

// #endregion

/**
 * Owns the appearance draft for one Settings route while the saved theme remains authoritative.
 *
 * @public
 */
@Injectable()
export class AppearanceSettingsStore {
  // #region Fields

  private readonly _context = inject(PLATFORM_SETTINGS_CONTEXT);
  private _session: SettingsHostSession | undefined;
  private _settings: ApplicationSettingsDto | undefined;
  /**
   * The theme.
   *
   * @public
   * @readonly
   */
  public readonly theme = signal<'light' | 'dark' | 'system'>('system');
  private readonly _saveThemeCommand: Command<void> = new Command(
    () => void this.onExecuteSaveThemeCommand(),
  );
  private readonly _updateThemeCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateThemeCommand(event),
  );

  // #endregion

  // #region Ctor

  /**
   * Resets the same appearance draft after authoritative settings change.
   *
   * @public
   */
  public constructor() {
    effect(() => {
      const settings = this._context.settings();
      if (!settings || settings === this._settings) return;
      this._settings = settings;
      this.theme.set(settings.user.theme);
    });
  }

  // #endregion

  // #region Properties

  /**
   * The saveTheme command.
   *
   * @public
   * @readonly
   */
  public get saveThemeCommand(): Command<void> {
    return this._saveThemeCommand;
  }
  /**
   * The updateTheme command.
   *
   * @public
   * @readonly
   */
  public get updateThemeCommand(): Command<unknown> {
    return this._updateThemeCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Retains a draft across section switches and resets it once for a new Settings route.
   *
   * @public
   */
  public beginSession(session: SettingsHostSession): void {
    if (session === this._session) return;
    this._session = session;
    this._settings = this._context.settings();
    this.theme.set(this._settings?.user.theme ?? 'system');
  }

  /**
   * Saves the theme.
   *
   * @private
   */
  private async onExecuteSaveThemeCommand(): Promise<void> {
    const current = this.requireSettings();
    await this._context.saveSettings({
      ...current,
      user: { ...current.user, theme: this.theme() },
    });
  }
  /**
   * Updates the theme.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateThemeCommand(event: unknown): void {
    const value = this.eventValue(event);
    if (value === 'light' || value === 'dark' || value === 'system') this.theme.set(value);
  }
  private requireSettings(): ApplicationSettingsDto {
    const settings = this._context.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }
  private eventValue(event: unknown): unknown {
    return mosaikEventValue(event);
  }

  // #endregion
}
