// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { INotificationItem } from '../models/INotificationItem';

// #endregion

const LIST_FORMAT = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

/**
 * Names the places problems come from, workspaces first and this Mac last:
 * `FLAMOX365 and this Mac`.
 *
 * @public
 */
@Pipe({ name: 'notificationScopeList', standalone: true, pure: true })
export class NotificationScopeListPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms problems into the list of places they come from.
   *
   * @param items - The problems that need attention.
   * @returns The places joined as an English list, or an empty string without problems.
   * @public
   */
  public transform(items: readonly INotificationItem[]): string {
    const workspaces = [
      ...new Set(
        items.flatMap((item) => (item.scope.kind === 'workspace' ? [item.scope.name] : [])),
      ),
    ];
    const places = items.some((item) => item.scope.kind === 'mac')
      ? [...workspaces, 'this Mac']
      : workspaces;
    return LIST_FORMAT.format(places);
  }

  // #endregion
}
