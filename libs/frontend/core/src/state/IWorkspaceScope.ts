/**
 * Changes workspace and board selection through the owning Workspace feature.
 *
 * @public
 */
export interface IWorkspaceScope {
  /** Consumes the existing selectWorkspaceScope behavior. @public */
  selectWorkspaceScope(workspaceId: string): Promise<void>;
  /** Consumes the existing selectSource behavior. @public */
  selectSource(workspaceId: string): Promise<void>;
  /** Consumes the existing selectBoard behavior. @public */
  selectBoard(sourceId: string | undefined): Promise<void>;
}
