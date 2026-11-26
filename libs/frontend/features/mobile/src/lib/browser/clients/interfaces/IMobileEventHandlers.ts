/**
 * Product invalidation observers within one bounded SDK event connection.
 *
 * @public
 */
export interface IMobileEventHandlers {
  /**
   * Reconciles current product state after the event channel opens or recovers.
   *
   * @returns Returns after scheduling a fresh authoritative product read.
   *
   * @public
   */
  readonly open: () => void;
  /**
   * Receives bounded untrusted event content for mobileEventSchema validation.
   *
   * @param data - Bounded event content requiring canonical product validation before use.
   * @returns Returns after processing or rejecting the product invalidation.
   *
   * @public
   */
  readonly message: (data: unknown) => void;
  /**
   * Reports connection loss; callers may read current authorization without replaying a command.
   *
   * @returns Returns after scheduling any necessary product reconciliation.
   *
   * @public
   */
  readonly close: () => void;
}
