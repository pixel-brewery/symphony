// #region Imports

import type { Signal } from '@angular/core';
import type { IExternalServiceIncident } from '@symphony/domain-platform';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';

// #endregion

/**
 * Native tool capabilities consumed by desktop composition and account features.
 *
 * @public
 */
export interface IPlatformOperations {
  readonly externalServiceIncidents: Signal<readonly IExternalServiceIncident[]>;
  initializeIncidents(): void;
  readonly runtimeHealth: Signal<RuntimeHealthDto | undefined>;
  readonly runtimeHealthBusy: Signal<boolean>;
  readonly runtimeDependencyInstallBusy: Signal<
    RequestPayload<'runtime-dependencies.install'>['command'] | undefined
  >;
  refreshRuntimeHealth(silent?: boolean): Promise<void>;
  installRuntimeDependency(
    command: RequestPayload<'runtime-dependencies.install'>['command'],
  ): Promise<boolean>;
}
