// #region Imports

import type { Type } from '@angular/core';

// #endregion

/**
 * One setting a section contributes to `Search settings`.
 *
 * Search matches the label, the description, the keywords, the current value and the breadcrumb.
 * A result opens its section; when the entry contributes a control, the result changes the setting
 * in place instead.
 *
 * @public
 */
export interface ISettingsSearchEntry {
  /**
   * Identifier, unique within the contributing view.
   *
   * @public
   * @readonly
   */
  readonly id: string;
  /**
   * The setting's label as the section shows it, for example `Daily token budget`.
   *
   * @public
   * @readonly
   */
  readonly label: string;
  /**
   * The help text below the label.
   *
   * @public
   * @readonly
   */
  readonly description?: string;
  /**
   * The group inside the section, appended to the breadcrumb, for example
   * `Fix failed checks › Budgets`.
   *
   * @public
   * @readonly
   */
  readonly group?: string;
  /**
   * Further words that should find the setting.
   *
   * @public
   * @readonly
   */
  readonly keywords?: readonly string[];
  /**
   * The current value as text, so a value can be searched too.
   *
   * @public
   * @readonly
   */
  readonly value?: string;
  /**
   * The workspace a dynamic entry belongs to. Entries of workspace sections without it are listed
   * once for every workspace.
   *
   * @public
   * @readonly
   */
  readonly workspaceId?: string;
  /**
   * Further Settings route keys applied when the result opens, for example `{ agent: 'ida' }`, so
   * the owning feature's route initializer opens the exact editor.
   *
   * @public
   * @readonly
   */
  readonly parameters?: Readonly<Record<string, string>>;
  /**
   * Loads a standalone component that renders the setting's control alone, so the result changes
   * the setting in place. The component reads the result through `SETTINGS_SEARCH_RESULT`.
   *
   * @public
   * @readonly
   */
  readonly loadControl?: () => Promise<Type<unknown>>;
}
