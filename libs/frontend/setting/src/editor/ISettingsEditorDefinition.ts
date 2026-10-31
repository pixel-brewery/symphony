// #region Imports

import type { Type } from '@angular/core';
import type { WorkspaceSettingsSection } from '../models/WorkspaceSettingsSection';
import type { ISettingsEditorRequest } from './ISettingsEditorRequest';

// #endregion

/**
 * Contributes a feature-owned editor, runtime request guard and lazy component.
 *
 * @public
 */
export interface ISettingsEditorDefinition {
  /**
   * Unique editor contribution identifier.
   *
   * @public
   * @readonly
   */
  readonly id: string;
  /**
   * Stable request kind used by existing workflow actions.
   *
   * @public
   * @readonly
   */
  readonly kind: string;
  /**
   * Optional section activated before opening this editor or a follow-up.
   *
   * @public
   * @readonly
   */
  readonly workspaceSection?: WorkspaceSettingsSection;
  /**
   * Width of the sheet in pixels. Settings sheets are 640px wide unless an editor needs
   * more room, such as the agent sheet with its live preview (920px).
   *
   * @public
   * @readonly
   */
  readonly width?: `${number}px`;
  /**
   * Validates the owning feature's specific request before a sheet is created.
   *
   * @public
   * @readonly
   */
  readonly isRequest: (request: ISettingsEditorRequest) => boolean;
  /**
   * Loads the owning feature's editor component.
   *
   * @public
   * @readonly
   */
  readonly loadComponent: () => Promise<Type<unknown>>;
}
