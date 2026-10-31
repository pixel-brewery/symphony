// #region Imports

import { inject } from '@angular/core';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import type { IFeedbackSettingsEditorRequest } from './IFeedbackSettingsEditorRequest';

// #endregion

/**
 * Resolves `?section=services&intake=<id>` to the sheet of that workspace's Microsoft Teams
 * feedback intake.
 *
 * @returns The resolver.
 * @public
 */
export function resolveFeedbackIntakeEditorRoute(): (
  value: string,
  workspaceId: string | undefined,
) => IFeedbackSettingsEditorRequest | undefined {
  const context = inject(FEEDBACK_SETTINGS_CONTEXT);
  return (sourceId, workspaceId) => {
    const source = context
      .settings()
      ?.feedbackIntakeSources.find(
        (item) => item.id === sourceId && item.workspaceId === workspaceId,
      );
    return source
      ? { kind: 'teams-feedback', workspaceId: source.workspaceId, sourceId: source.id }
      : undefined;
  };
}
