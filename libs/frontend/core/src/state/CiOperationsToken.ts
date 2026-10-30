// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiOperations } from './ICiOperations';

// #endregion

/**
 * Resolves the feature-owned CI operations consumed by shared capabilities.
 *
 * @public
 */
export const CI_OPERATIONS = new InjectionToken<ICiOperations>('CI_OPERATIONS');
