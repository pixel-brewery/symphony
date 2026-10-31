/**
 * Contributes one feature refresh after the active workspace configuration has changed.
 *
 * @public
 */
export interface IWorkspaceRefreshParticipant {
  /**
   * Refreshes the participant for the now-active workspace.
   *
   * @public
   */
  refresh(): Promise<void>;
}
