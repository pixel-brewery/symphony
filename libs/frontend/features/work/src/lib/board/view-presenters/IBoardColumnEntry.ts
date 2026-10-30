// #region Imports

import type { IDeliveryGroup } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * One logical entry in a provider board column.
 *
 * @public
 */
export type IBoardColumnEntry =
  | { readonly id: string; readonly kind: 'group'; readonly group: IDeliveryGroup }
  | { readonly id: string; readonly kind: 'item'; readonly item: IWorkItem };
