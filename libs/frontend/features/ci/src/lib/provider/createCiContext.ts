// #region Imports

import { computed, inject } from '@angular/core';
import { CiSnapshotContext } from '../adapters/CiSnapshotContext';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import type { ICiContext } from '../ports/ICiContext';

// #endregion

/**
 * Composes the existing CI projection with its feature-owned local-run availability policy.
 *
 * @returns The single read-only CI context for this application injector.
 * @internal
 */
export function createCiContext(): ICiContext {
  const environment = inject(CiSnapshotContext);
  const projection = inject(ApplicationProjection);
  return {
    runs: environment.runs,
    workflows: environment.workflows,
    remoteData: environment.remoteData,
    localCiEnabledWorkspaceIds: computed(
      () =>
        new Set(
          (projection.settings()?.workspaces ?? [])
            .filter((workspace) => workspace.localCiEnabled)
            .map((workspace) => workspace.id),
        ),
    ),
  };
}
