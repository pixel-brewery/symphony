// #region Imports

import type { IConnectionPageInfo } from './IConnectionPageInfo';
import type { IProjectListNode } from './IProjectListNode';

// #endregion

export interface IProjectListConnection {
  readonly pageInfo?: IConnectionPageInfo;
  readonly nodes?: readonly (IProjectListNode | null)[];
}
