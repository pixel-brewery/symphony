// #region Imports

import type { Signal } from '@angular/core';
import type { IPullRequestSummary } from '@symphony/domain-delivery';

// #endregion

/**
 * The existing pull-request projection consumed by Delivery's global search.
 *
 * @public
 */
export interface IDeliverySearchContext {
  readonly snapshot: Signal<{ readonly pullRequests?: readonly IPullRequestSummary[] } | undefined>;
}
