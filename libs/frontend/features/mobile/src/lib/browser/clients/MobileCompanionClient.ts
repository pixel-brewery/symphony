// #region Imports

import { inject, InjectionToken } from '@angular/core';
import { BrowserMobileCompanionClient } from './BrowserMobileCompanionClient';
import type { IMobileCompanionClient } from './IMobileCompanionClient';

// #endregion

/** Typed mobile browser boundary used by {@link MobileCompanionStore}. */
export const MOBILE_COMPANION_CLIENT = new InjectionToken<IMobileCompanionClient>(
  'MOBILE_COMPANION_CLIENT',
  { providedIn: 'root', factory: () => inject(BrowserMobileCompanionClient) },
);
