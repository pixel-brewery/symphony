// #region Imports

import type { SettingsAlertTone } from './SettingsAlertTone';

// #endregion

/**
 * One confirmation or notice shown as an alert sheet of the Settings window.
 *
 * @public
 */
export interface ISettingsAlert {
  /**
   * Stable identifier; the sheet carries `test-id="settings-alert-{id}"` and its buttons
   * `settings-alert-{id}-confirm` / `settings-alert-{id}-cancel`.
   *
   * @public
   * @readonly
   */
  readonly id: string;
  /**
   * The question or statement, for example `Remove this machine?`.
   *
   * @public
   * @readonly
   */
  readonly header: string;
  /**
   * What happens, in one or two sentences.
   *
   * @public
   * @readonly
   */
  readonly message: string;
  /**
   * Icon and colour of the sheet. Defaults to `danger` for destructive alerts, otherwise `warning`.
   *
   * @public
   * @readonly
   */
  readonly tone?: SettingsAlertTone;
  /**
   * Label of the primary button, for example `Remove machine` or `OK`.
   *
   * @public
   * @readonly
   */
  readonly confirmLabel: string;
  /**
   * Label of the secondary button, for example `Keep machine`. Without it the sheet is a notice
   * with only the primary button.
   *
   * @public
   * @readonly
   */
  readonly cancelLabel?: string;
  /**
   * Whether the primary button removes or overwrites something; it is then drawn as a danger
   * button.
   *
   * @public
   * @readonly
   */
  readonly destructive?: boolean;
}
