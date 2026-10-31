// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideViewSlot } from '@pixel-brewery/mosaik-elements-angular';
import { composeProviders, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { FEEDBACK_OPERATIONS } from '@symphony/frontend-core/feedback';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsEditorRoute,
  withSettingsSearch,
  type ISettingsServiceSelection,
} from '@symphony/frontend-setting';
import { FEEDBACK_CLIENT } from '../ports/FeedbackClientToken';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import type { IFeedbackSettingsContext } from '../ports/IFeedbackSettingsContext';
import { feedbackIntakeSearchEntries } from '../settings/feedbackIntakeSearchEntries';
import { isFeedbackSettingsEditorRequest } from '../settings/isFeedbackSettingsEditorRequest';
import { resolveFeedbackIntakeEditorRoute } from '../settings/resolveFeedbackIntakeEditorRoute';
import { FeedbackStore } from '../state/FeedbackStore';

// #endregion

/**
 * Registers the actual intake state, native services fragment, lazy channel editor with its
 * `?intake=` route and one `Search settings` entry per intake. @public
 */
export function provideFeedbackFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...composeProviders(
      [
        FeedbackStore,
        { provide: FEEDBACK_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        {
          provide: FEEDBACK_SETTINGS_CONTEXT,
          useFactory: (): IFeedbackSettingsContext => inject(ConfigurationStore),
        },
        { provide: FEEDBACK_OPERATIONS, useExisting: FeedbackStore },
      ],
      [
        withSettingsEditor({
          id: 'feedback-channel-editor',
          kind: 'teams-feedback',
          width: '600px',
          isRequest: isFeedbackSettingsEditorRequest,
          loadComponent: () =>
            import('../settings/FeedbackSettingsEditorView').then(
              (module) => module.FeedbackSettingsEditorView,
            ),
        }),
        withSettingsSearch({
          id: 'feedback-intake-search',
          sectionId: 'services',
          searchEntries: feedbackIntakeSearchEntries,
        }),
        withSettingsEditorRoute({
          id: 'feedback-intake-route',
          section: 'services',
          parameter: 'intake',
          resolve: resolveFeedbackIntakeEditorRoute,
        }),
      ],
    ),
    provideViewSlot<ISettingsServiceSelection>(SettingsViewSlot.WorkspaceServicesFeedback, [
      {
        id: 'workspace-feedback-settings',
        order: 10,
        canActivate: (selection) => selection?.sectionId === 'services' && !!selection.workspaceId,
        loadComponent: () =>
          import('../settings/FeedbackSettingsView').then((module) => module.FeedbackSettingsView),
      },
    ]),
  ]);
}
