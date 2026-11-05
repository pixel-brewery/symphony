// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { INotificationItem } from '../models/INotificationItem';
import { labelLocale, translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const listFormat = (): Intl.ListFormat =>
  new Intl.ListFormat(labelLocale(), { style: 'long', type: 'conjunction' });

/**
 * Names the places problems come from, workspaces first and this Mac last:
 * `Example Workspace and this Mac`.
 *
 * @public
 */
@Pipe({ name: 'notificationScopeList', standalone: true, pure: false })
export class NotificationScopeListPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms problems into the list of places they come from.
   *
   * @param items - The problems that need attention.
   * @returns The places joined in the application language, or an empty string without problems.
   * @public
   */
  public transform(items: readonly INotificationItem[]): string {
    const workspaces = [
      ...new Set(
        items.flatMap((item) => (item.scope.kind === 'workspace' ? [item.scope.name] : [])),
      ),
    ];
    const places = items.some((item) => item.scope.kind === 'mac')
      ? [...workspaces, translateLabel('loc.symphony.labels.this.mac')]
      : workspaces;
    return listFormat().format(places);
  }

  // #endregion
}
