// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiContext } from './ICiContext';

// #endregion

/**
 * Supplies the CI feature's bounded context dependency.
 *
 * @public
 */
export const CI_CONTEXT = new InjectionToken<ICiContext>('CI_CONTEXT');
