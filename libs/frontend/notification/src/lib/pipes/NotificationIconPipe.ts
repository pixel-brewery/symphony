// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { NotificationKind } from '../models/NotificationKind';
import type { NotificationSeverity } from '../models/NotificationSeverity';

// #endregion

interface INotificationIcon {
  readonly icon: 'errorCircle' | 'warning' | 'info' | 'checkmarkCircle';
  readonly variant: 'danger' | 'warning' | 'info' | 'success' | 'default';
}

/**
 * Maps a problem's severity or a notice's kind to its status icon and colour.
 *
 * @public
 */
@Pipe({ name: 'notificationIcon', standalone: true, pure: true })
export class NotificationIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms a severity or kind into its icon.
   *
   * @param kind - A problem's severity or a notice's kind.
   * @param tone - `notice` draws a plain information icon, as the history does.
   * @returns The registered icon name and its variant.
   * @public
   */
  public transform(
    kind: NotificationSeverity | NotificationKind,
    tone: 'attention' | 'notice' = 'attention',
  ): INotificationIcon {
    switch (kind) {
      case 'error':
        return { icon: 'errorCircle', variant: 'danger' };
      case 'warning':
        return { icon: 'warning', variant: 'warning' };
      case 'success':
        return { icon: 'checkmarkCircle', variant: 'success' };
      case 'info':
        return { icon: 'info', variant: tone === 'notice' ? 'default' : 'info' };
    }
  }

  // #endregion
}
