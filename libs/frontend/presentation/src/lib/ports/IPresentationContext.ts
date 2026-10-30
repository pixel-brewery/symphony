// #region Imports

import type { Signal } from '@angular/core';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';

// #endregion

/** The shared projections and commands actually used by the desktop shell and rail. @public */
export interface IPresentationContext {
  /** Authoritative process snapshot. @public @readonly */
  readonly snapshot: Signal<IOrchestrationSnapshot | undefined>;
  /** Authoritative installation configuration. @public @readonly */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /** First-snapshot loading state. @public @readonly */
  readonly loading: Signal<boolean>;
  /** Current configured workspace. @public @readonly */
  readonly activeWorkspace: Signal<ApplicationSettingsDto['workspaces'][number] | undefined>;
  /** Current feature-owned local CI run. @public @readonly */
  readonly localCiRunningRunId: Signal<string | undefined>;
  /** Start time of that same local run. @public @readonly */
  readonly localCiStartedAt: Signal<string | undefined>;
  /** CI's own provider-refresh lifecycle. @public @readonly */
  readonly continuousIntegrationRunsBusy: Signal<boolean>;
  /** Whether Execution contributes commands to this product. @public @readonly */
  readonly executionAvailable: boolean;
  /** Whether CI contributes commands to this product. @public @readonly */
  readonly ciAvailable: boolean;
  /** Whether the current product supports changing workspace scope. @public @readonly */
  readonly workspaceScopeAvailable: boolean;
  /** Joins the shared once-only bootstrap. @public */
  initialize(): Promise<void>;
  /** Withdraws a queued execution through its owner. @public */
  removeQueueEntry(entryId: string): Promise<boolean>;
  /** Refreshes CI only when included in this product. @public */
  refreshContinuousIntegrationRuns(): Promise<void>;
  /** Changes scope through Workspace's actual selection owner. @public */
  selectWorkspaceScope(workspaceId: string): Promise<void>;
}
