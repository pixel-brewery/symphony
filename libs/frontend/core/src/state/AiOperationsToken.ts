// #region Imports

import { InjectionToken } from '@angular/core';
import type { IAiOperations } from './IAiOperations';

// #endregion

/**
 * Consumes the explicitly composed AI feature without importing its implementation.
 *
 * @public
 */
export const AI_OPERATIONS = new InjectionToken<IAiOperations>('AiOperations');
