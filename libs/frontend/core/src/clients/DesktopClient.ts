// #region Imports

import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';
import type { IDesktopApi } from '@symphony/ipc-contracts-desktop';
import type {} from './PreloadHost';

// #endregion

/**
 * Typed renderer boundary for desktop lifecycle operations.
 *
 * @public
 */
export const DESKTOP_CLIENT = new InjectionToken<IDesktopApi>('DESKTOP_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const browserWindow = inject(DOCUMENT).defaultView;
    if (!browserWindow) throw new Error('Desktop access requires a browser window.');
    return browserWindow.desktop;
  },
});
