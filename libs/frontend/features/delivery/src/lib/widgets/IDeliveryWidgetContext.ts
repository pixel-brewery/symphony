// #region Imports

import type { Signal } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';

// #endregion

/** Existing Delivery summaries consumed by its state mosaic. @public */
export interface IDeliveryWidgetContext {
  readonly snapshot: Signal<
    | {
        readonly pullRequests?: readonly IPullRequestSummary[];
        readonly ciRuns?: readonly ICiRun[];
      }
    | undefined
  >;
}
