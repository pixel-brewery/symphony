// #region Imports

import type { Signal } from '@angular/core';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';

// #endregion

/**
 * Supplies read-only CI projections from the existing snapshot and configuration owners.
 *
 * @public
 */
export interface ICiContext {
  /** Current projected remote runs. @public @readonly */
  readonly runs: Signal<readonly ICiRun[]>;
  /** Current projected workflow definitions. @public @readonly */
  readonly workflows: Signal<readonly ICiWorkflow[]>;
  /** Availability of the current remote projection. @public @readonly */
  readonly remoteData: Signal<IRemoteDataStatus | undefined>;
  /** Workspace-scoped local-runner configuration. @public @readonly */
  readonly localCiEnabledWorkspaceIds: Signal<ReadonlySet<string>>;
}
