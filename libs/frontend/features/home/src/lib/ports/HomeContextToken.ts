// #region Imports

import { computed, inject, InjectionToken } from '@angular/core';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { PLATFORM_OPERATIONS } from '@symphony/frontend-core/platform';
import type { IHomeContext } from './IHomeContext';

// #endregion

/** Binds Home's bounded projections without constructing other product features. @public */
export const HOME_CONTEXT = new InjectionToken<IHomeContext>('HOME_CONTEXT', {
  providedIn: 'root',
  factory: () => {
    const projection = inject(ApplicationProjection);
    const platform = inject(PLATFORM_OPERATIONS, { optional: true });
    return {
      hasSnapshot: computed(() => Boolean(projection.snapshot())),
      externalServiceIncident: computed(() => platform?.externalServiceIncidents()[0]),
    };
  },
});
