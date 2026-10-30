// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

/** The transport fields changed by the existing Delivery operations. @public */
export interface IDeliveryProjectionValue {
  readonly pullRequests?: readonly IPullRequestSummary[];
  readonly executions: readonly IExecutionRecord[];
}
