// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/** Execution freshness consumed by the generic snapshot synchronizer. @public */
export interface IExecutionActivity {
  readonly activityFresh: Signal<boolean>;
  markActivityFresh(fresh: boolean): void;
}
