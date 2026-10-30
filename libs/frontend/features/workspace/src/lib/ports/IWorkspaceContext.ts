// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Projects the authoritative configuration and available board scope for Workspace.
 *
 * @public
 */
export interface IWorkspaceContext {
  /**
   * Current validated aggregate configuration.
   *
   * @public
   * @readonly
   */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /**
   * Enabled boards in the currently selected workspace scope.
   *
   * @public
   * @readonly
   */
  readonly availableBoards: Signal<ApplicationSettingsDto['workItemSources']>;
}
