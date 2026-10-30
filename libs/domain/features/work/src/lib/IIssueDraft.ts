// #region Imports

import type { ProjectFieldValue } from './ProjectFieldValue';

// #endregion

export interface IIssueDraft {
  title: string;
  body: string;
  projectFields: readonly ProjectFieldValue[];
  labels: readonly string[];
  assignees: readonly string[];
}
