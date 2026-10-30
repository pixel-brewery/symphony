// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSettingsEditor, type SettingsFeatureKind } from '@symphony/frontend-setting';
import { isWorkSourceSettingsEditorRequest } from '../settings/isWorkSourceSettingsEditorRequest';

// #endregion

/** Contributes the actual Azure DevOps and GitHub Projects source editors with Work. @public */
export function withWorkSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return (['azure-devops', 'github-projects'] as const).map((kind) =>
    withSettingsEditor({
      id: `work-${kind}-editor`,
      kind,
      isRequest: isWorkSourceSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/WorkSourceSettingsEditorView').then(
          (module) => module.WorkSourceSettingsEditorView,
        ),
    }),
  );
}
