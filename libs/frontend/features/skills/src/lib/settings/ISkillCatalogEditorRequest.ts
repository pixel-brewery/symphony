// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';
import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/**
 * Opens the `Add skills` sheet, optionally for one optional AI step.
 *
 * @public
 */
export interface ISkillCatalogEditorRequest extends ISettingsEditorRequest {
  /**
   * The editor kind.
   *
   * @public
   * @readonly
   */
  readonly kind: 'skill-catalog';
  /**
   * The optional AI step the sheet proposes for every package, when opened from a step.
   *
   * @public
   * @readonly
   */
  readonly role?: SkillFlowRole;
}
