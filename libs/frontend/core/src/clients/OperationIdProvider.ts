// #region Imports
import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';
// #endregion

/**
 * Creates opaque operation identifiers at the browser boundary.
 *
 * @public
 */
export const OPERATION_ID_PROVIDER = new InjectionToken<() => string>('OPERATION_ID_PROVIDER', {
  providedIn: 'root',
  factory: () => {
    const browserWindow = inject(DOCUMENT).defaultView;
    if (!browserWindow) throw new Error('Operation identifiers require a browser window.');
    return () => browserWindow.crypto.randomUUID();
  },
});
