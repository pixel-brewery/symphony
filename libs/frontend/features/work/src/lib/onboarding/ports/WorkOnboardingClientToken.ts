// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkOnboardingClient } from './IWorkOnboardingClient';

// #endregion

/**
 * Supplies Work onboarding's validated native request capability.
 *
 * @public
 */
export const WORK_ONBOARDING_CLIENT = new InjectionToken<IWorkOnboardingClient>(
  'WORK_ONBOARDING_CLIENT',
);
