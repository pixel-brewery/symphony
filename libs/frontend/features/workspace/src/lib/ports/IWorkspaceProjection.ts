// #region Imports

import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Applies already-validated workspace results through the existing aggregate owners.
 *
 * @public
 */
export interface IWorkspaceProjection {
  /**
   * Applies settings returned by the workspace transaction.
   *
   * @public
   */
  applySettings(settings: ApplicationSettingsDto): void;
  /**
   * Updates the existing storage projection after cleanup.
   *
   * @public
   */
  updateStorageStatus(status: ResponsePayload<'storage.status.get'>): void;
}
