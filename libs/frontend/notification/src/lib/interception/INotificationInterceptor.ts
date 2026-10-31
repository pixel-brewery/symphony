// #region Imports

import type { INotificationMessage } from '../models/INotificationMessage';

// #endregion

export interface INotificationInterceptor {
  push(notification: INotificationMessage): void;
}
