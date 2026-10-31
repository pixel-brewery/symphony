// #region Imports

import { inject, Injector, type Provider } from '@angular/core';
import { ORCHESTRATION_CLIENT, CI_OPERATIONS } from '@symphony/frontend-core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { WORK_CONNECTION_OPERATIONS } from '@symphony/frontend-core/work';
import { SourceConnectionStore } from '../state/SourceConnectionStore';
import { WORK_CONNECTION_CLIENT } from '../ports/WorkConnectionClientToken';
import { WORK_CONNECTION_PROJECTION } from '../ports/WorkConnectionProjectionToken';
import { WORK_CONNECTION_REFRESH } from '../ports/WorkConnectionRefreshToken';
import type { IWorkConnectionProjection } from '../ports/IWorkConnectionProjection';
import type { IWorkConnectionRefresh } from '../ports/IWorkConnectionRefresh';

// #endregion

/** Registers Work's single source-account owner and its existing shared-state participants. @public */
export function provideWorkConnections(): Provider[] {
  return [
    SourceConnectionStore,
    { provide: WORK_CONNECTION_CLIENT, useExisting: ORCHESTRATION_CLIENT },
    {
      provide: WORK_CONNECTION_PROJECTION,
      useFactory: (): IWorkConnectionProjection => inject(ConfigurationStore),
    },
    {
      provide: WORK_CONNECTION_REFRESH,
      useFactory: (): IWorkConnectionRefresh => {
        const configuration = inject(ConfigurationStore),
          injector = inject(Injector);
        return {
          refreshSettings: () => configuration.refreshSettings(),
          refreshContinuousIntegrationUsage: (ids, silent) =>
            injector.get(CI_OPERATIONS, null)?.refreshContinuousIntegrationUsage(ids, silent),
        };
      },
    },
    { provide: WORK_CONNECTION_OPERATIONS, useExisting: SourceConnectionStore },
  ];
}
