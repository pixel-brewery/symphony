// #region Imports

import type { INotificationAction } from './INotificationAction';
import type { NotificationScope } from './NotificationScope';
import type { NotificationSeverity } from './NotificationSeverity';

// #endregion

/**
 * A setup or system problem that needs attention, contributed by the feature that owns it.
 *
 * @public
 */
export interface INotificationItem {
  /**
   * Stable identifier, unique across every source, for example `developer-tools:codex`.
   *
   * @public
   * @readonly
   */
  readonly id: string;

  /**
   * How urgently the problem needs the user.
   *
   * @public
   * @readonly
   */
  readonly severity: NotificationSeverity;

  /**
   * One-line statement of the problem, for example `Codex CLI is not installed`.
   *
   * @public
   * @readonly
   */
  readonly title: string;

  /**
   * Where the problem lives, outermost first, for example `['System', 'Developer tools']`.
   *
   * @public
   * @readonly
   */
  readonly location: readonly string[];

  /**
   * The consequence or the context the fix needs, for example
   * `the Default account cannot run until it is`.
   *
   * @public
   * @readonly
   */
  readonly detail?: string;

  /**
   * The workspace the problem belongs to, or this Mac.
   *
   * @public
   * @readonly
   */
  readonly scope: NotificationScope;

  /**
   * The fixes, most important last as drawn (`Reject`, `Approve`).
   *
   * @public
   * @readonly
   */
  readonly actions: readonly INotificationAction[];
}
