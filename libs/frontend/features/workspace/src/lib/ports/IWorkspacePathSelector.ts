// #region Imports

import type { PathSelectionRequest, PathSelectionResponse } from '@symphony/ipc-contracts-desktop';

// #endregion

/**
 * Desktop path selection consumed by Workspace import and export.
 *
 * @public
 */
export interface IWorkspacePathSelector {
  /**
   * Selects a file or directory through the existing sandbox boundary.
   *
   * @public
   */
  selectPath(options: PathSelectionRequest): Promise<PathSelectionResponse>;
}
