// #region Imports

import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

export interface IGitWorktreeWorkspaceOptions {
  readonly workspaceRoot: (workspaceId?: string) => string;
  readonly workspaceIds?: () => readonly string[];
  readonly repository: (workItem: IWorkItem) => IRepositoryBinding | undefined;
}
