// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  withSettingsEditor,
  withSettingsEditorRoute,
  withSettingsRouteInitializer,
  withSettingsSearch,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { initializeSetupSettingsRoute } from '../onboarding/routing/initializeSetupSettingsRoute';
import { isSetupSheetRequest } from '../onboarding/routing/isSetupSheetRequest';
import { isWorkSourceSettingsEditorRequest } from '../settings/isWorkSourceSettingsEditorRequest';
import { resolveWorkAccountEditorRoute } from '../settings/resolveWorkAccountEditorRoute';
import { resolveWorkBoardEditorRoute } from '../settings/resolveWorkBoardEditorRoute';
import { workSettingsSearchEntries } from '../settings/workSettingsSearchEntries';

// #endregion

/**
 * Contributes the Azure DevOps and GitHub Projects source editors with their `?board=` and
 * `?account=` routes, one `Search settings` entry per board and work account, and the `Build your
 * project team` sheet with its `?sheet=setup` route effect. @public
 */
export function withWorkSettings(): readonly IFeature<SettingsFeatureKind>[] {
  const sourceEditors = (['azure-devops', 'github-projects'] as const).map((kind) =>
    withSettingsEditor({
      id: `work-${kind}-editor`,
      kind,
      width: '600px',
      isRequest: isWorkSourceSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/WorkSourceSettingsEditorView').then(
          (module) => module.WorkSourceSettingsEditorView,
        ),
    }),
  );
  return [
    ...sourceEditors,
    withSettingsEditor({
      id: 'work-setup-editor',
      kind: 'setup',
      width: '760px',
      isRequest: isSetupSheetRequest,
      loadComponent: () =>
        import('../onboarding/views/SetupView').then((module) => module.SetupView),
    }),
    withSettingsRouteInitializer({
      id: 'work-setup-route',
      initialize: initializeSetupSettingsRoute,
    }),
    withSettingsSearch({
      id: 'work-services-search',
      sectionId: 'services',
      searchEntries: workSettingsSearchEntries,
    }),
    withSettingsEditorRoute({
      id: 'work-board-route',
      section: 'services',
      parameter: 'board',
      resolve: resolveWorkBoardEditorRoute,
    }),
    withSettingsEditorRoute({
      id: 'work-account-route',
      section: 'services',
      parameter: 'account',
      resolve: resolveWorkAccountEditorRoute,
    }),
  ];
}
