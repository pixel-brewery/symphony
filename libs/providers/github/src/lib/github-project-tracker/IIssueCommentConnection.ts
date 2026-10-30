// #region Imports

import type { IConnectionPageInfo } from './IConnectionPageInfo';
import type { IIssueCommentNode } from './IIssueCommentNode';

// #endregion

export interface IIssueCommentConnection {
  readonly pageInfo?: IConnectionPageInfo;
  readonly nodes?: readonly IIssueCommentNode[];
}
