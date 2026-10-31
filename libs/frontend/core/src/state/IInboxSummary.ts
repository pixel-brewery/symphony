// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/**
 * What waits in the Inbox, for surfaces outside it such as the menu-bar panel's `Needs you`
 * section. The feature that owns the Inbox projection provides it.
 *
 * @public
 */
export interface IInboxSummary {
  /**
   * Number of decisions waiting in the Inbox of the active workspace; `undefined` while unknown.
   *
   * @public
   * @readonly
   */
  readonly decisionCount: Signal<number | undefined>;

  /**
   * Title of the first decision in the Inbox's order, for example `Choose how CR-0589 continues`.
   *
   * @public
   * @readonly
   */
  readonly firstDecisionTitle: Signal<string | undefined>;

  /**
   * Loads the state the summary derives from, for windows that do not hydrate the application.
   *
   * @public
   */
  refresh(): Promise<void>;
}
