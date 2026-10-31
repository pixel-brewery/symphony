// #region Imports

import type { Signal } from '@angular/core';
import type { INotificationItem } from '../models/INotificationItem';

// #endregion

/**
 * A feature's contribution to the notification centre: the problems the feature currently sees
 * in its own state, each with the place it lives and its fix.
 *
 * Register a source with `withNotificationSources` in the owning feature's provider.
 *
 * @public
 */
export interface INotificationSource {
  /**
   * The problems that need attention now, derived from the owning feature's state.
   *
   * @public
   * @readonly
   */
  readonly items: Signal<readonly INotificationItem[]>;

  /**
   * Loads the state the items derive from, without reporting failures as toasts. The centre
   * calls it when it opens and in windows that do not hydrate the application, such as the
   * menu-bar panel.
   *
   * @public
   */
  refresh?(): Promise<void>;

  /**
   * Starts updates the application does not otherwise keep current, such as pending pairing
   * requests. Called once per window that shows the notification centre.
   *
   * @public
   */
  connect?(): void;

  /**
   * Performs one of an item's fixes with the feature's existing command and confirmation, or
   * opens the place where it is resolved.
   *
   * @param itemId - Identifier of an item this source returned.
   * @param actionId - Identifier of one of that item's actions.
   * @public
   */
  perform(itemId: string, actionId: string): void | Promise<void>;
}
