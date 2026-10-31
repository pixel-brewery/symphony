// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import type { IPreparedWorkspace } from './IPreparedWorkspace';
import type { IWorkspaceChangeSet } from './IWorkspaceChangeSet';
import type { WorkspacePurpose } from './WorkspacePurpose';

// #endregion

export interface IWorkspacePort {
  prepare(
    executionId: string,
    workItem: IWorkItem,
    purpose: WorkspacePurpose,
  ): Promise<IPreparedWorkspace>;
  isAvailable(path: string): Promise<boolean>;
  inspectChanges(path: string): Promise<IWorkspaceChangeSet>;
  preserve(path: string): Promise<void>;
  listManaged(workspaceId?: string): Promise<readonly string[]>;
  release(path: string): Promise<boolean>;
}
