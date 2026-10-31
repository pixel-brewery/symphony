// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiProjection } from './ICiProjection';

// #endregion

/**
 * Supplies the CI feature's bounded projection dependency.
 *
 * @public
 */
export const CI_PROJECTION = new InjectionToken<ICiProjection>('CI_PROJECTION');
