// #region Imports
import { InjectionToken } from '@angular/core';
import type { IApplicationBootstrapExecution } from './IApplicationBootstrapExecution';
// #endregion

/**
 * Connects the optional Execution startup participant to the application bootstrap.
 *
 * @public
 */
export const APPLICATION_BOOTSTRAP_EXECUTION = new InjectionToken<IApplicationBootstrapExecution>(
  'symphony.application-bootstrap.execution',
);
