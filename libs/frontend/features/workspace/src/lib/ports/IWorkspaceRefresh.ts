/**
 * Exposes the existing snapshot refresh and cached-target sequencing for Workspace.
 *
 * @public
 */
export interface IWorkspaceRefresh {
  /**
   * Reconciles the active workspace snapshot.
   *
   * @public
   */
  refresh(): Promise<void>;
  /**
   * Loads the target's cache before its provider refresh while preserving the active-scope guard.
   *
   * @public
   */
  loadCachedSnapshotForWorkspace(workspaceId: string): Promise<void>;
}
