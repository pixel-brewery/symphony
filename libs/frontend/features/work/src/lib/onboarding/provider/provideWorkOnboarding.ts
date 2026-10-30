// #region Imports

import type { Provider } from '@angular/core';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { WORK_ONBOARDING_CLIENT } from '../ports/WorkOnboardingClientToken';
import { WORK_ONBOARDING_CONTEXT } from '../ports/WorkOnboardingContextToken';
import { createWorkOnboardingContext } from './createWorkOnboardingContext';

// #endregion

/**
 * Registers the bounded onboarding dependencies within the Work feature.
 *
 * @public
 */
export function provideWorkOnboarding(): Provider[] {
  return [
    { provide: WORK_ONBOARDING_CLIENT, useExisting: ORCHESTRATION_CLIENT },
    { provide: WORK_ONBOARDING_CONTEXT, useFactory: createWorkOnboardingContext },
  ];
}
