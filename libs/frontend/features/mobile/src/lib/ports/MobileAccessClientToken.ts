// #region Imports

import { InjectionToken } from '@angular/core';
import type { IMobileAccessClient } from './IMobileAccessClient';

// #endregion

/**
 * Supplies Mobile's bounded desktop client.
 *
 * @public
 */
export const MOBILE_ACCESS_CLIENT = new InjectionToken<IMobileAccessClient>('MOBILE_ACCESS_CLIENT');
