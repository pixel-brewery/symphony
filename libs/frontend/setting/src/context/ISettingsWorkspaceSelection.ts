/**
 * Identifies the selected workspace and section supplied to a feature settings slot.
 *
 * @public
 */
export interface ISettingsWorkspaceSelection {
  /**
   * Current workspace identifier.
   *
   * @public
   * @readonly
   */
  readonly workspaceId: string;
  /**
   * Independently contributed settings section identifier.
   *
   * @public
   * @readonly
   */
  readonly sectionId: string;
}
