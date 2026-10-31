/**
 * One fix offered on a notification. The owning source performs it with its existing command and
 * confirmation, or opens the place where the problem is resolved.
 *
 * @public
 */
export interface INotificationAction {
  /**
   * Identifier the owning source recognises in `perform`.
   *
   * @public
   * @readonly
   */
  readonly id: string;

  /**
   * Button text, for example `Install with Homebrew`.
   *
   * @public
   * @readonly
   */
  readonly label: string;

  /**
   * `primary` for the main fix, `secondary` for a fix that opens or prepares something,
   * `danger` for a rejecting choice beside a primary one.
   *
   * @public
   * @readonly
   */
  readonly emphasis: 'primary' | 'secondary' | 'danger';

  /**
   * Whether the fix is running right now.
   *
   * @public
   * @readonly
   */
  readonly busy?: boolean;

  /**
   * Whether the fix cannot start right now, for example while another installation runs.
   *
   * @public
   * @readonly
   */
  readonly disabled?: boolean;
}
