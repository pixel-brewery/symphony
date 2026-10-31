// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSettingsEditor, type SettingsFeatureKind } from '@symphony/frontend-setting';
import { isAiAccountSettingsEditorRequest } from '../settings/isAiAccountSettingsEditorRequest';

// #endregion

/** Contributes the feature-owned editor without a business-kind switch in the host. @public */
export function withAiSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsEditor({
      id: 'ai-settings-editor',
      kind: 'ai-account',
      workspaceSection: 'services',
      isRequest: isAiAccountSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/AiAccountSettingsEditorView').then(
          (module) => module.AiAccountSettingsEditorView,
        ),
    }),
  ];
}
