/**
 * Identifies a feature-owned Settings editor without exposing its business fields to the host.
 *
 * @public
 */
export interface ISettingsEditorRequest {
  /**
   * Kind registered by the owning feature.
   *
   * @public
   * @readonly
   */
  readonly kind: string;
  /**
   * Optional workspace supplied explicitly by the invoking action.
   *
   * @public
   * @readonly
   */
  readonly workspaceId?: string;
}
