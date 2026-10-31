// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

/**
 * What Symphony knows about the delivery behind a pull request: the work item it delivers, the
 * agent that worked on it last, and its latest AI check repair.
 *
 * @public
 */
export interface IPullRequestDelivery {
  /** Work item the pull request delivers, when Symphony published it. */
  readonly workItemId?: string;
  /** Tracker key of that work item, such as `#142` or `CR-0589`. */
  readonly workItemKey?: string;
  /** Agent profile that ran the latest execution of that work item. */
  readonly agentProfileId?: string;
  /** Display name of that agent. */
  readonly agentName?: string;
  /** Latest AI diagnosis or repair of the pull request's checks. */
  readonly repairExecution?: IExecutionRecord;
  /** Whether an execution of the work item is queued, running or waiting. */
  readonly active: boolean;
}
