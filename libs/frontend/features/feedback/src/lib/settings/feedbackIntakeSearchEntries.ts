// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';

// #endregion

/**
 * One `Search settings` entry per Microsoft Teams feedback intake in `Connected services`, with
 * whether it creates work items as value; the result opens the intake's sheet.
 *
 * @returns The entries of every workspace's feedback intakes.
 * @public
 */
export function feedbackIntakeSearchEntries(): Signal<readonly ISettingsSearchEntry[]> {
  const context = inject(FEEDBACK_SETTINGS_CONTEXT);
  return computed(() =>
    (context.settings()?.feedbackIntakeSources ?? []).map((source): ISettingsSearchEntry => ({
      id: `feedback-intake-${source.id}`,
      label: source.displayName,
      description: 'Microsoft Teams feedback intake',
      group: 'Feedback intake',
      keywords: ['Microsoft Teams', 'channel', 'feedback', 'intake'],
      value: source.enabled ? 'Enabled' : 'Disabled',
      workspaceId: source.workspaceId,
      parameters: { intake: source.id },
    })),
  );
}
