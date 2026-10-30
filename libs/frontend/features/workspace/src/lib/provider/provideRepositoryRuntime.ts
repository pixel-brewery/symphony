// #region Imports

import type { Provider } from '@angular/core';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import { REPOSITORY_RUNTIME_CLIENT } from '../ports/RepositoryRuntimeClientToken';
import { RepositoryRuntimeStore } from '../state/RepositoryRuntimeStore';

// #endregion

/**
 * Registers Workspace's one repository runtime owner within its product feature.
 *
 * @returns The native providers composed by Workspace.
 * @public
 */
export function provideRepositoryRuntime(): Provider[] {
  return [
    RepositoryRuntimeStore,
    { provide: REPOSITORY_RUNTIME_CLIENT, useExisting: ORCHESTRATION_CLIENT },
    { provide: REPOSITORY_RUNTIME_OPERATIONS, useExisting: RepositoryRuntimeStore },
  ];
}
