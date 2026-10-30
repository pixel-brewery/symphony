// #region Imports

import type { IAutomationReceipt, IAutomationSourceCheckpoint } from '@symphony/domain-automation';

// #endregion

/**
 * Retains only the receipts and source checkpoints consumed by feedback synchronization.
 *
 * @public
 */
export interface IFeedbackIntakeRepository {
  /**
   * Stores the latest durable outcome for one feedback signal.
   *
   * @public
   */
  saveAutomationReceipt(receipt: IAutomationReceipt): void;

  /**
   * Reads recorded outcomes before a feedback signal can create another Work Item.
   *
   * @public
   */
  listAutomationReceipts(): readonly IAutomationReceipt[];

  /**
   * Stores the baseline established for one feedback source.
   *
   * @public
   */
  saveAutomationCheckpoint(checkpoint: IAutomationSourceCheckpoint): void;

  /**
   * Reads source baselines retained across synchronization and restart.
   *
   * @public
   */
  listAutomationCheckpoints(): readonly IAutomationSourceCheckpoint[];
}
