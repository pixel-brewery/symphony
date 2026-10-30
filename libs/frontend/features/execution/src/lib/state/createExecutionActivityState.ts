// #region Imports

import { signal } from '@angular/core';
import type { IExecutionActivity } from '@symphony/frontend-core/execution';

// #endregion

/** Creates the single feature-owned activity signal without constructing synchronization. @public */
export function createExecutionActivityState(): IExecutionActivity {
  const activityFresh = signal(true);
  return {
    activityFresh: activityFresh.asReadonly(),
    markActivityFresh(fresh: boolean): void {
      activityFresh.set(fresh);
    },
  };
}
