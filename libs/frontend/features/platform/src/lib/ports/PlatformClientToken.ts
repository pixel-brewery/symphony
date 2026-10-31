// #region Imports

import { InjectionToken } from '@angular/core';
import type { IPlatformClient } from './IPlatformClient';

// #endregion

/**
 * Supplies the feature-owned consumer boundary.
 *
 * @public
 */
export const PLATFORM_CLIENT = new InjectionToken<IPlatformClient>('PLATFORM_CLIENT');
