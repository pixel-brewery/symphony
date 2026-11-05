// #region Imports

import { registerLocaleData } from '@angular/common';
import german from '@angular/common/locales/de';

// #endregion

/**
 * Makes German available to Angular's existing date and number formatters.
 *
 * @public
 */
export function registerApplicationLocales(): void {
  registerLocaleData(german);
}
