// #region Imports

import type { IAgenticDeliveryRecord } from '@symphony/domain-automation';

// #endregion

/** Persists the recovery state updated by an execution. @public */
export interface IAgenticDeliveryRecoveryRepository {
  /** Reads existing managed delivery attempts for one execution update. @public */
  listAgenticDeliveries(): readonly IAgenticDeliveryRecord[];

  /** Records the existing managed delivery attempt. @public */
  saveAgenticDelivery(delivery: IAgenticDeliveryRecord): void;
}
