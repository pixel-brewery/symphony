// #region Imports

import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import type {} from './PreloadHost';

// #endregion

export const ORCHESTRATION_CLIENT = new InjectionToken<IOrchestrationApi>('ORCHESTRATION_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const browserWindow = inject(DOCUMENT).defaultView;
    if (!browserWindow) throw new Error('Orchestration access requires a browser window.');
    return browserWindow.orchestration;
  },
});
