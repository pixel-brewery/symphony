// #region Imports

import type { IBoardColumn } from './IBoardColumn';
import type { IWorkItem } from './IWorkItem';
import type { ProjectFieldDefinition } from './ProjectFieldDefinition';

// #endregion

export interface IWorkTrackingProjection {
  version: 1;
  workspaceIds: readonly string[];
  workItems: readonly IWorkItem[];
  projectFields: readonly ProjectFieldDefinition[];
  boardColumns: readonly IBoardColumn[];
  refreshedAt: string;
}
