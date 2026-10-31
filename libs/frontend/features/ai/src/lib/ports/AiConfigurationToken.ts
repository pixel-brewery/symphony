// #region Imports

import { InjectionToken } from '@angular/core';
import type { IAiConfiguration } from './IAiConfiguration';

// #endregion

/**
 * Consumed dependency of the AI feature.
 *
 * @public
 */
export const AI_CONFIGURATION = new InjectionToken<IAiConfiguration>('AiConfiguration');
