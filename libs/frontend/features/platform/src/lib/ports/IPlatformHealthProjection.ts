// #region Imports

import type { Signal } from '@angular/core';
import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';

// #endregion

/**
 * The sole transport health projection consumed and updated by native tool operations.
 *
 * @public
 */
export interface IPlatformHealthProjection {
  readonly runtimeHealth: Signal<RuntimeHealthDto | undefined>;
  updateRuntimeHealth(health: RuntimeHealthDto): void;
}
