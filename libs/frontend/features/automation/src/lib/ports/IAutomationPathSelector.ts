// #region Imports

import type { PathSelectionRequest, PathSelectionResponse } from '@symphony/ipc-contracts-desktop';

// #endregion

/**
 * Native directory selection consumed by runtime policy editing.
 *
 * @public
 */
export interface IAutomationPathSelector {
  selectPath(options: PathSelectionRequest): Promise<PathSelectionResponse>;
}
