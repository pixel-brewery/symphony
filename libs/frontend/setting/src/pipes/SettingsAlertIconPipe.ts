// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { SettingsAlertTone } from '../alerts/SettingsAlertTone';

// #endregion

/**
 * Maps an alert tone to its registered icon name.
 *
 * @public
 */
@Pipe({ name: 'settingsAlertIcon' })
export class SettingsAlertIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Returns the icon of an alert tone.
   *
   * @param tone - Alert tone.
   * @returns `warning`, `errorCircle` or `info`.
   * @public
   */
  public transform(tone: SettingsAlertTone): string {
    switch (tone) {
      case 'danger':
        return 'errorCircle';
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
    }
  }

  // #endregion
}
