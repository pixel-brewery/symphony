// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Read-only state consumed by Workspace's settings cards and editor.
 *
 * @public
 */
export interface IWorkspaceSettingsContext {
  /**
   * Authoritative validated configuration.
   *
   * @public
   * @readonly
   */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /**
   * Whole-settings persistence in flight.
   *
   * @public
   * @readonly
   */
  readonly configurationBusy: Signal<boolean>;
  /**
   * Existing shared editor exclusion across settings operations.
   *
   * @public
   * @readonly
   */
  readonly editorBusy: Signal<boolean>;
  /**
   * Shared measured storage projection.
   *
   * @public
   * @readonly
   */
  readonly storageStatus: Signal<ResponsePayload<'storage.status.get'> | undefined>;
}
