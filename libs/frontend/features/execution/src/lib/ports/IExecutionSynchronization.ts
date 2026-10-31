// #region Imports

import type { IExecutionActivity } from '@symphony/frontend-core/execution';

// #endregion

/** Owns event subscription, execution polling and freshness for this renderer. @public */
export interface IExecutionSynchronization extends IExecutionActivity {
  initialize(): void;
  scheduleExecutionStateRefresh(delayMilliseconds?: number): void;
}
