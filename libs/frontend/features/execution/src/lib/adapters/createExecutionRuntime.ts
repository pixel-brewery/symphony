// #region Imports

import { inject } from '@angular/core';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import type { IExecutionRuntime } from '../ports/IExecutionRuntime';

// #endregion

/** Binds Execution's consumed repository refresh to the included Workspace capability. @public */
export function createExecutionRuntime(): IExecutionRuntime {
  const runtime = inject(REPOSITORY_RUNTIME_OPERATIONS, { optional: true });
  return {
    refreshRepositoryRuntime: () => runtime?.refreshRepositoryRuntime() ?? Promise.resolve(false),
  };
}
