// #region Imports

import type { Signal } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';

// #endregion

/**
 * The existing pull-request projection consumed by Delivery's global search and command palette;
 * the Action runs summarise each open pull request's checks in the palette.
 *
 * @public
 */
export interface IDeliverySearchContext {
  readonly snapshot: Signal<
    | {
        readonly pullRequests?: readonly IPullRequestSummary[];
        readonly ciRuns?: readonly ICiRun[];
      }
    | undefined
  >;
}
