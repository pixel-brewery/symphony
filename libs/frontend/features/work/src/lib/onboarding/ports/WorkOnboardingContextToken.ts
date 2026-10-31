// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkOnboardingContext } from './IWorkOnboardingContext';

// #endregion

/**
 * Supplies Work onboarding's bounded projections and capabilities.
 *
 * @public
 */
export const WORK_ONBOARDING_CONTEXT = new InjectionToken<IWorkOnboardingContext>(
  'WORK_ONBOARDING_CONTEXT',
);
