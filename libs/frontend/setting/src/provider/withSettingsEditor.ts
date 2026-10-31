// #region Imports

import { createFeature, type IFeature } from '@symphony/frontend-core';
import type { ISettingsEditorDefinition } from '../editor/ISettingsEditorDefinition';
import { SETTINGS_EDITORS } from '../editor/SettingsEditorsToken';
import type { SettingsFeatureKind } from './SettingsFeatureKind';
import { SettingsFeatureKinds } from './SettingsFeatureKinds';

// #endregion

/**
 * Registers a feature-owned editor with the existing Core composition kernel.
 *
 * @param editor - Specific request guard and lazy editor component.
 * @returns The feature's Settings editor contribution.
 * @public
 */
export function withSettingsEditor(
  editor: ISettingsEditorDefinition,
): IFeature<SettingsFeatureKind> {
  return createFeature(
    editor.id,
    SettingsFeatureKinds.Editor,
    [{ provide: SETTINGS_EDITORS, useValue: editor, multi: true }],
    { multi: true },
  );
}
