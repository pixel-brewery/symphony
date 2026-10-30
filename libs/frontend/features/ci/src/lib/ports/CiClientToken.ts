// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiClient } from './ICiClient';

// #endregion

/**
 * Supplies the CI feature's bounded client dependency.
 *
 * @public
 */
export const CI_CLIENT = new InjectionToken<ICiClient>('CI_CLIENT');
