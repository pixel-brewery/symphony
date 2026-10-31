// #region Imports

import type { IRunnerImageDefinition } from '@symphony/domain-core';
import type { WorkspaceIsolationMode } from './WorkspaceIsolationMode';

// #endregion

export interface IWorkspaceDefinition {
  id: string;
  displayName: string;
  shortCode: string;
  color: string;
  enabled: boolean;
  isolation: WorkspaceIsolationMode;
  storageLimitGiB: number;
  /**
   * Whether this workspace may run GitHub Actions locally. Local runs are a workspace decision;
   * the machine specification they boot stays host-wide in `IApplicationSettings.localCi`.
   */
  localCiEnabled: boolean;
  /**
   * Whether Analyzer proposals that satisfy every delivery-group gate may activate without a
   * second operator confirmation. Disabled workspaces still receive visible proposals.
   */
  automaticDeliveryGroupingEnabled?: boolean;
  /** Guest image every managed local execution in this workspace boots. */
  localCiImage?: IRunnerImageDefinition;
}
