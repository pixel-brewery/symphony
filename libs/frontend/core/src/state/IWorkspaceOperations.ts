// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/**
 * Consumes administration commands from the owning Workspace feature.
 *
 * @public
 */
export interface IWorkspaceOperations {
  /** Feature-owned workspaceCleanupBusy state. @public @readonly */
  readonly workspaceCleanupBusy: Signal<boolean>;
  /** Feature-owned workspaceDeletionBusy state. @public @readonly */
  readonly workspaceDeletionBusy: Signal<string | undefined>;
  /** Feature-owned workspaceTransferBusy state. @public @readonly */
  readonly workspaceTransferBusy: Signal<'import' | string | undefined>;
  /** Consumes the existing clearWorkspaces behavior. @public */
  clearWorkspaces(): Promise<boolean>;
  /** Consumes the existing deleteWorkspace behavior. @public */
  deleteWorkspace(workspaceId: string): Promise<boolean>;
  /** Consumes the existing exportWorkspace behavior. @public */
  exportWorkspace(workspaceId: string, destinationRoot: string): Promise<boolean>;
  /** Consumes the existing importWorkspace behavior. @public */
  importWorkspace(sourcePath: string): Promise<boolean>;
}
