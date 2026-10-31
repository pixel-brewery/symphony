// #region Imports

import type { IWorkItemFieldRepair } from './IWorkItemFieldRepair';
import type { IWorkItemIssue } from './IWorkItemIssue';
import type { WorkItemIssueSeverity } from './WorkItemIssueSeverity';

// #endregion

export interface IWorkItemHealth {
  /** Worst severity found, or `undefined` when the item is sound. */
  readonly severity?: WorkItemIssueSeverity;
  readonly issues: readonly IWorkItemIssue[];
  /** Every repair the issues offer, in the order they are reported. */
  readonly repairs: readonly IWorkItemFieldRepair[];
}
