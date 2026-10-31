// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { INotificationAction } from '../models/INotificationAction';

// #endregion

interface INotificationActionAppearance {
  readonly appearance: 'solid' | 'outline' | 'plain';
  readonly variant: 'primary' | 'danger' | 'default';
}

/**
 * Maps a fix's emphasis to the button appearance drawn in the notification centre.
 *
 * @public
 */
@Pipe({ name: 'notificationActionAppearance', standalone: true, pure: true })
export class NotificationActionAppearancePipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms an emphasis into a button appearance and variant.
   *
   * @param emphasis - The fix's emphasis.
   * @returns The appearance and variant of its button.
   * @public
   */
  public transform(emphasis: INotificationAction['emphasis']): INotificationActionAppearance {
    switch (emphasis) {
      case 'primary':
        return { appearance: 'solid', variant: 'primary' };
      case 'secondary':
        return { appearance: 'outline', variant: 'default' };
      case 'danger':
        return { appearance: 'plain', variant: 'danger' };
    }
  }

  // #endregion
}
