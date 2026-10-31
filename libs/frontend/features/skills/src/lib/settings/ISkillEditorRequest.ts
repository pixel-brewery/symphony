// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/**
 * Opens the skill package sheet: `New skill` to create one, `Skill details` to review or edit an
 * installed one.
 *
 * @public
 */
export type ISkillEditorRequest = ISettingsEditorRequest &
  (
    | { readonly kind: 'skill-editor'; readonly mode: 'create' }
    | { readonly kind: 'skill-editor'; readonly mode: 'edit'; readonly skillId: string }
  );
