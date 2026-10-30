// #region Imports

import type { Signal } from '@angular/core';
import type {
  ApplicationSettingsDto,
  RequestPayload,
  ResponsePayload,
} from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Read-only aggregate context consumed by AI state and Settings surfaces.
 *
 * @public
 */
export interface IAiContext {
  /** Whether the composed product includes the actual native installation owner. @public @readonly */
  readonly nativeInstallAvailable: boolean;
  /**
   * Current validated settings; the shared writer remains its only owner.
   *
   * @public
   * @readonly
   */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /**
   * Existing shared configuration activity exclusion.
   *
   * @public
   * @readonly
   */
  readonly configurationBusy: Signal<boolean>;
  /**
   * Existing shared drawer exclusion.
   *
   * @public
   * @readonly
   */
  readonly editorBusy: Signal<boolean>;
  /**
   * Current validated provider-account status.
   *
   * @public
   * @readonly
   */
  readonly connections: Signal<ResponsePayload<'connections.get'> | undefined>;
  /**
   * Developer-tool availability already projected by Core.
   *
   * @public
   * @readonly
   */
  readonly runtimeHealth: Signal<ResponsePayload<'health.get'> | undefined>;
  /**
   * Existing runtime installer operation; no second flag is created.
   *
   * @public
   * @readonly
   */
  readonly runtimeDependencyInstallBusy: Signal<
    RequestPayload<'runtime-dependencies.install'>['command'] | undefined
  >;
}
