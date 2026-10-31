// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/**
 * Supplies feature-owned settings cards with the host's current bounded selection.
 *
 * @public
 */
export interface ISettingsWorkspaceContext {
  /**
   * Workspace being configured, independent of the application's active workspace.
   *
   * @public
   * @readonly
   */
  readonly workspaceId: Signal<string | null>;
  /**
   * Selected contributed section, or null while the host has no workspace section.
   *
   * @public
   * @readonly
   */
  readonly sectionId: Signal<string | null>;
}
