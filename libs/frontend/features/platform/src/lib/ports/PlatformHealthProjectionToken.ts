// #region Imports

import { InjectionToken } from '@angular/core';
import type { IPlatformHealthProjection } from './IPlatformHealthProjection';

// #endregion

/**
 * Supplies the feature-owned consumer boundary.
 *
 * @public
 */
export const PLATFORM_HEALTH_PROJECTION = new InjectionToken<IPlatformHealthProjection>(
  'PLATFORM_HEALTH_PROJECTION',
);
