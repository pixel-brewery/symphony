/**
 * Requests authoritative snapshot refresh after a saved Skills assignment.
 *
 * @public
 */
export interface ISkillsSnapshotRefresh {
  /**
   * Refreshes the current snapshot through its existing owner.
   *
   * @public
   */
  refresh(): Promise<void>;
}
