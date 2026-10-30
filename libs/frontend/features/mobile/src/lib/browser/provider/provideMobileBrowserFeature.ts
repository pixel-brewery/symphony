// #region Imports

import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { MobileCompanionStore } from '../state/MobileCompanionStore';
import { MobileThemeStore } from '../theme/MobileThemeStore';

// #endregion

/**
 * Initializes the browser companion and theme without constructing desktop services.
 *
 * @returns Browser-only Mobile initialization providers.
 * @public
 */
export function provideMobileBrowserFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => inject(MobileCompanionStore).initialize()),
    provideAppInitializer(() => inject(MobileThemeStore).initialize()),
  ]);
}
