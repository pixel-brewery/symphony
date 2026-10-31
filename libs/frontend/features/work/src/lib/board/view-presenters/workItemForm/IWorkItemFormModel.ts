// #region Imports

import type { ProjectFieldValue } from '@symphony/domain-work';

// #endregion

/**
 * Editable values of a work item, shared by the new-work-item sheet and the work-item screen.
 *
 * @public
 */
export interface IWorkItemFormModel {
  title: string;
  body: string;
  repository: string;
  workItemType: string;
  projectFields: ProjectFieldValue[];
  labels: string[];
  assignees: string[];
}
