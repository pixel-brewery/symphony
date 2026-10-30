// #region Imports

import type {
  IAgenticDeliveryRecord,
  IAutomationReceipt,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';

// #endregion

/**
 * Persists the durable receipts, source positions and delivery recovery owned by automation.
 *
 * @public
 */
export interface IAutomationRepository {
  /**
   * Stores the last recorded outcome of a remote automation signal.
   *
   * @public
   */
  saveAutomationReceipt(receipt: IAutomationReceipt): void;

  /**
   * Lists the persisted outcomes used to avoid replaying handled signals.
   *
   * @public
   */
  listAutomationReceipts(): readonly IAutomationReceipt[];

  /**
   * Stores the last observed position of an automation source.
   *
   * @public
   */
  saveAutomationCheckpoint(checkpoint: IAutomationSourceCheckpoint): void;

  /**
   * Lists source positions retained across synchronization and restart.
   *
   * @public
   */
  listAutomationCheckpoints(): readonly IAutomationSourceCheckpoint[];

  /**
   * Stores the recovery state of an admitted agentic delivery operation.
   *
   * @public
   */
  saveAgenticDelivery(record: IAgenticDeliveryRecord): void;

  /**
   * Lists delivery operations used for qualification, recovery and duplicate prevention.
   *
   * @public
   */
  listAgenticDeliveries(): readonly IAgenticDeliveryRecord[];
}
