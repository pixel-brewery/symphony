// #region Imports

import { type ProjectFieldValue } from './ProjectFieldValue';

// #endregion

/** A single project-field write that restores a documented default without inventing data. */
export interface IWorkItemFieldRepair {
  readonly fieldId: string;
  readonly fieldName: string;
  /** What the value will read as after the write, for the confirmation list. */
  readonly valueLabel: string;
  readonly value: ProjectFieldValue;
}
