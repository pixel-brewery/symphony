// #region Imports

import type { NotificationKind } from './NotificationKind';

// #endregion

/**
 * A notice the app showed as a toast, kept as history for the day.
 *
 * @public
 */
export interface INotificationNotice {
  /**
   * Identifier unique within this window's history.
   *
   * @public
   * @readonly
   */
  readonly id: string;

  /**
   * The toast's kind.
   *
   * @public
   * @readonly
   */
  readonly kind: NotificationKind;

  /**
   * The toast's header.
   *
   * @public
   * @readonly
   */
  readonly title: string;

  /**
   * The toast's content line; empty when the toast had none.
   *
   * @public
   * @readonly
   */
  readonly content: string;

  /**
   * When the toast was shown, in epoch milliseconds.
   *
   * @public
   * @readonly
   */
  readonly occurredAt: number;

  /**
   * Whether the user saw it: a toast shown while the window had focus counts as read.
   *
   * @public
   * @readonly
   */
  readonly read: boolean;
}
