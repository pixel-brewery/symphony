// #region Imports

import { InjectionToken } from '@angular/core';
import type { IPlatformOperations } from './IPlatformOperations';

// #endregion

/**
 * Supplies the included Platform feature's native tool owner.
 *
 * @public
 */
export const PLATFORM_OPERATIONS = new InjectionToken<IPlatformOperations>('PLATFORM_OPERATIONS');
