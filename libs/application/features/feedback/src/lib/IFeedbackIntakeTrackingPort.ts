// #region Imports

import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * Reads existing Work Items so a recovered feedback request never creates a duplicate.
 *
 * @public
 */
export interface IFeedbackIntakeTrackingPort {
  /**
   * Reads the tracked items used when no dedicated automation projection is available.
   *
   * @public
   */
  listWorkItems(): Promise<readonly IWorkItem[]>;

  /**
   * Reads the automation-specific item projection when the tracker supplies it.
   *
   * @public
   */
  listAutomationWorkItems?(): Promise<readonly IWorkItem[]>;
}
