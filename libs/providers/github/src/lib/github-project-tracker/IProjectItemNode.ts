// #region Imports

import type { IAssigneeConnection } from './IAssigneeConnection';
import type { IConnectionPageInfo } from './IConnectionPageInfo';
import type { ILabelConnection } from './ILabelConnection';
import type { IProjectFieldValueNode } from './IProjectFieldValueNode';

// #endregion

export interface IProjectItemNode {
  readonly id?: string;
  readonly content?: {
    readonly __typename?: string;
    readonly id?: string;
    readonly title?: string;
    readonly number?: number;
    readonly url?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly repository?: { readonly nameWithOwner?: string };
    readonly labels?: ILabelConnection;
    readonly assignees?: IAssigneeConnection;
  } | null;
  readonly fieldValues?: {
    readonly pageInfo?: IConnectionPageInfo;
    readonly nodes?: readonly IProjectFieldValueNode[];
  };
}
