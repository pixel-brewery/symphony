// #region Imports

import { inject, Injectable } from '@angular/core';
import { type ThemePreference, ViewPresenter, Command } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore, MobileThemeStore } from '@symphony/frontend-feature-mobile/browser';

// #endregion

@Injectable()
export class MobileConnectionViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _store = inject(MobileCompanionStore);
  private readonly _themes = inject(MobileThemeStore);

  /**
   * The snapshot.
   *
   * @public
   * @readonly
   */
  public readonly snapshot = this._store.snapshot;

  /**
   * The connection state.
   *
   * @public
   * @readonly
   */
  public readonly connectionState = this._store.connectionState;

  /**
   * The error.
   *
   * @public
   * @readonly
   */
  public readonly error = this._store.error;

  /**
   * The theme.
   *
   * @public
   * @readonly
   */
  public readonly theme = this._themes.preference;

  private readonly _retryCommand: Command<void> = new Command(
    () => void this.onExecuteRetryCommand(),
  );
  private readonly _updateThemeCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateThemeCommand(event),
  );
  // #endregion

  // #region Properties

  /**
   * The retry command.
   *
   * @public
   * @readonly
   */
  public get retryCommand(): Command<void> {
    return this._retryCommand;
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
   * Retries.
   *
   * @private
   */
  private onExecuteRetryCommand(): void {
    void this._store.retry();
  }

  /**
   * Updates the theme.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateThemeCommand(event: unknown): void {
    const value = this.eventValue(event);
    if (value === 'light' || value === 'dark' || value === 'system') {
      this._themes.setPreference(value);
    }
  }

  private eventValue(event: unknown): ThemePreference | undefined {
    if (event === 'light' || event === 'dark' || event === 'system') return event;
    const record =
      typeof event === 'object' && event !== null ? (event as Record<string, unknown>) : {};
    const detail =
      typeof record['detail'] === 'object' && record['detail'] !== null
        ? (record['detail'] as Record<string, unknown>)
        : {};
    const target =
      typeof record['target'] === 'object' && record['target'] !== null
        ? (record['target'] as Record<string, unknown>)
        : {};
    const newValue = record['newValue'] ?? detail['newValue'];
    const selection =
      typeof newValue === 'object' && newValue !== null
        ? (newValue as Record<string, unknown>)['value']
        : newValue;
    const value = record['value'] ?? detail['value'] ?? selection ?? target['value'];
    return value === 'light' || value === 'dark' || value === 'system' ? value : undefined;
  }

  // #endregion
}
