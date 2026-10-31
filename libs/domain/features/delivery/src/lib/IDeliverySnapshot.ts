// #region Imports

import type { IDeliveryEvidence } from './IDeliveryEvidence';
import type { IDeliveryTarget } from './IDeliveryTarget';

// #endregion

/**
 * Delivery destinations and observed evidence for the current workspace scope.
 *
 * @public
 */
export interface IDeliverySnapshot {
  readonly targets: readonly IDeliveryTarget[];
  readonly evidence: readonly IDeliveryEvidence[];
  readonly refreshedAt: string;
  readonly errors: readonly { readonly targetId: string; readonly message: string }[];
}
