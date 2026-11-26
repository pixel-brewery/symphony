// #region Imports

import { inject, InjectionToken } from '@angular/core';
import { BrowserMobileCompanionClient } from './BrowserMobileCompanionClient';
import type { IMobileCompanionClient } from './interfaces/IMobileCompanionClient';

// #endregion

/**
 * Injects the SDK-backed mobile browser product boundary.
 *
 * @public
 */
export const MOBILE_COMPANION_CLIENT = new InjectionToken<IMobileCompanionClient>(
  'MOBILE_COMPANION_CLIENT',
  { providedIn: 'root', factory: () => inject(BrowserMobileCompanionClient) },
);
