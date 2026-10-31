// #region Imports

import type { IConnectionPageInfo } from './IConnectionPageInfo';

// #endregion

export interface IAssigneeConnection {
  readonly pageInfo?: IConnectionPageInfo;
  readonly nodes?: readonly { readonly login?: string }[];
}
