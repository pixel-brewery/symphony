// #region Imports

import type { IWorkItemFieldRepair } from './IWorkItemFieldRepair';
import type { WorkItemIssueSeverity } from './WorkItemIssueSeverity';

// #endregion

export interface IWorkItemIssue {
  /** Stable key; used for tracking in templates and for tests. */
  readonly id: string;
  readonly severity: WorkItemIssueSeverity;
  /** One short line. This is all the board tooltip shows. */
  readonly summary: string;
  /** What is wrong, in full. Shown only after the item is opened. */
  readonly detail: string;
  /** What the person has to do next. Always actionable, never a restatement of `detail`. */
  readonly remedy: string;
  /** Present when Symphony can derive the missing value instead of guessing it. */
  readonly repair?: IWorkItemFieldRepair;
}
