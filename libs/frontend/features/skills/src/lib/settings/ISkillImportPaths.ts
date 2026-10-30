// #region Imports
import type { PathSelectionRequest, PathSelectionResponse } from '@symphony/ipc-contracts-desktop';
// #endregion
/** Consumes the existing typed native directory picker. @public */
export interface ISkillImportPaths {
  selectPath(options: PathSelectionRequest): Promise<PathSelectionResponse>;
}
