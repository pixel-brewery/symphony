/**
 * Carries the selected section and optional workspace into native Settings view slots.
 *
 * @public
 */
export interface ISettingsSelection {
  /**
   * Selected section identifier.
   *
   * @public
   * @readonly
   */
  readonly sectionId: string;
  /**
   * Workspace being configured; null identifies the global settings scope.
   *
   * @public
   * @readonly
   */
  readonly workspaceId: string | null;
}
