// #region Imports

import type { NotificationKind } from './NotificationKind';

// #endregion

export interface INotificationMessage {
  readonly kind: NotificationKind;
  readonly title: string;
  readonly content: string;
}
