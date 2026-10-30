// #region Imports

import { InjectionToken } from '@angular/core';
import type { IAiClient } from './IAiClient';

// #endregion

/**
 * Consumed dependency of the AI feature.
 *
 * @public
 */
export const AI_CLIENT = new InjectionToken<IAiClient>('AiClient');
