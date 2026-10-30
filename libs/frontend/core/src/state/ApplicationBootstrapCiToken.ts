// #region Imports
import { InjectionToken } from '@angular/core';
import type { IApplicationBootstrapCi } from './IApplicationBootstrapCi';
// #endregion

/**
 * Connects the optional Ci startup participant to the application bootstrap.
 *
 * @public
 */
export const APPLICATION_BOOTSTRAP_CI = new InjectionToken<IApplicationBootstrapCi>(
  'symphony.application-bootstrap.ci',
);
