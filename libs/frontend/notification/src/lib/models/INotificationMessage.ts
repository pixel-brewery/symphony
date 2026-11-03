// #region Imports

import type { NotificationKind } from './NotificationKind';

// #endregion

export interface INotificationMessage {
  readonly kind: NotificationKind;
  readonly title: string;
  readonly content: string;
  /**
   * Stable owner and resource identifier for a persistent error episode.
   *
   * @public
   * @readonly
   */
  readonly groupKey?: string;
}
