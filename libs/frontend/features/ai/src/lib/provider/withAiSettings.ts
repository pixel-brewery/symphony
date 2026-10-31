// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  withSettingsEditor,
  withSettingsEditorRoute,
  withSettingsSearch,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { aiAccountSearchEntries } from '../settings/aiAccountSearchEntries';
import { isAiAccountSettingsEditorRequest } from '../settings/isAiAccountSettingsEditorRequest';
import { resolveAiAccountEditorRoute } from '../settings/resolveAiAccountEditorRoute';

// #endregion

/**
 * Contributes the feature-owned AI account sheet, its `?account=` route and one `Search settings`
 * entry per AI account, without a business-kind switch in the host.
 *
 * @public
 */
export function withAiSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsEditor({
      id: 'ai-settings-editor',
      kind: 'ai-account',
      workspaceSection: 'services',
      width: '780px',
      isRequest: isAiAccountSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/AiAccountSettingsEditorView').then(
          (module) => module.AiAccountSettingsEditorView,
        ),
    }),
    withSettingsSearch({
      id: 'ai-account-search',
      sectionId: 'services',
      searchEntries: aiAccountSearchEntries,
    }),
    withSettingsEditorRoute({
      id: 'ai-account-route',
      section: 'services',
      parameter: 'account',
      resolve: resolveAiAccountEditorRoute,
    }),
  ];
}
