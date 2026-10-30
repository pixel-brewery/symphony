// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideViewSlot } from '@pixel-brewery/mosaik-elements-angular';
import { composeProviders, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { FEEDBACK_OPERATIONS } from '@symphony/frontend-core/feedback';
import {
  SettingsViewSlot,
  withSettingsEditor,
  type ISettingsServiceSelection,
} from '@symphony/frontend-setting';
import { FEEDBACK_CLIENT } from '../ports/FeedbackClientToken';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import type { IFeedbackSettingsContext } from '../ports/IFeedbackSettingsContext';
import { isFeedbackSettingsEditorRequest } from '../settings/isFeedbackSettingsEditorRequest';
import { FeedbackStore } from '../state/FeedbackStore';

// #endregion

/** Registers the actual intake state, native services fragment and lazy channel editor. @public */
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
          isRequest: isFeedbackSettingsEditorRequest,
          loadComponent: () =>
            import('../settings/FeedbackSettingsEditorView').then(
              (module) => module.FeedbackSettingsEditorView,
            ),
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
