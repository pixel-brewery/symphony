// #region Imports

import { InjectionToken } from '@angular/core';
import type { IAiContext } from './IAiContext';

// #endregion

/**
 * Consumed dependency of the AI feature.
 *
 * @public
 */
export const AI_CONTEXT = new InjectionToken<IAiContext>('AiContext');
