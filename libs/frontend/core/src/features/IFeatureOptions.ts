/**
 * Controls whether a contribution category accepts multiple features.
 *
 * @public
 */
export interface IFeatureOptions {
  /**
   * Whether other features of the same kind may be composed alongside this feature.
   *
   * @public
   * @readonly
   */
  readonly multi?: boolean;
}
