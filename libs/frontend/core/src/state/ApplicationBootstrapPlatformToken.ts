// #region Imports
import { InjectionToken } from '@angular/core';
import type { IApplicationBootstrapPlatform } from './IApplicationBootstrapPlatform';
// #endregion

/**
 * Connects the optional Platform startup participant to the application bootstrap.
 *
 * @public
 */
export const APPLICATION_BOOTSTRAP_PLATFORM = new InjectionToken<IApplicationBootstrapPlatform>(
  'symphony.application-bootstrap.platform',
);
