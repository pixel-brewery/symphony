// #region Imports

import type { ProjectFieldValue } from './ProjectFieldValue';

// #endregion

export interface IWorkItemMutation {
  workspaceId?: string;
  sourceId?: string;
  workItemType?: string;
  revision?: number;
  title: string;
  body: string;
  repository: string;
  repositoryBindingIds?: readonly string[];
  projectFields: readonly ProjectFieldValue[];
  labels: readonly string[];
  assignees: readonly string[];
}
