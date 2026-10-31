// #region Imports

import type { IConnectionPageInfo } from './IConnectionPageInfo';

// #endregion

export interface ILabelConnection {
  readonly pageInfo?: IConnectionPageInfo;
  readonly nodes?: readonly { readonly name?: string }[];
}
