// #region Imports

import type { IDeliveryOperation } from '@symphony/domain-delivery';

// #endregion

/**
 * Owns the durable journal used to prevent duplicate delivery dispatches across restarts.
 *
 * @public
 */
export interface IDeliveryOperationRepository {
  /**
   * Loads the operations from the current repository scope.
   *
   * @returns Existing intents and observed run evidence.
   * @public
   */
  list(): readonly IDeliveryOperation[];
  /**
   * Persists an operation under its existing caller-owned identifier.
   *
   * @param operation - Intent or updated evidence to store durably.
   * @public
   */
  save(operation: IDeliveryOperation): void;
}
