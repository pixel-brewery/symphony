// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { FEEDBACK_OPERATIONS } from '@symphony/frontend-core/feedback';
import { NotificationService } from '@symphony/frontend-notification';
import {
  provideSettings,
  SettingsEditorRegistry,
  SettingsViewSlot,
} from '@symphony/frontend-setting';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import type { IFeedbackClient } from '../ports/IFeedbackClient';
import { FeedbackStore } from '../state/FeedbackStore';
import { provideFeedbackFeature } from './provideFeedbackFeature';

// #endregion

describe('provideFeedbackFeature', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('uses the feature busy owner for actual aggregate editor exclusion and contributes one native fragment', async () => {
    // arrange
    let complete: (value: ResponsePayload<'feedback-intake.test'>) => void = () => undefined;
    const pending = new Promise<ResponsePayload<'feedback-intake.test'>>((resolve) => {
      complete = resolve;
    });
    const request = vi.fn<IFeedbackClient['request']>().mockReturnValue(pending);
    TestBed.configureTestingModule({
      providers: [
        provideSettings(),
        provideFeedbackFeature(),
        { provide: ORCHESTRATION_CLIENT, useValue: { request } },
        {
          provide: NotificationService,
          useValue: { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() },
        },
      ],
    });
    const store = TestBed.inject(FeedbackStore);
    const context = TestBed.inject(FEEDBACK_SETTINGS_CONTEXT);

    // act
    const operation = store.testFeedbackIntake({
      id: 'feedback',
      workspaceId: 'personal',
      displayName: 'Channel',
      provider: 'microsoft-teams',
      tenantId: '00000000-0000-4000-8000-000000000001',
      clientId: '00000000-0000-4000-8000-000000000002',
      credentialRef: 'env:TEAMS_FEEDBACK_CLIENT_SECRET',
      teamId: '00000000-0000-4000-8000-000000000003',
      channelId: 'channel',
      targetWorkItemSourceId: 'project',
      targetRepositoryBindingId: 'repository',
      enabled: false,
    });
    const excludedDuringTest = context.editorBusy();
    complete({ status: 'completed', message: 'Channel read.' });
    await operation;

    // assert
    expect(TestBed.inject(FEEDBACK_OPERATIONS)).toBe(store);
    expect(excludedDuringTest).toBe(true);
    expect(context.editorBusy()).toBe(false);
    expect(
      TestBed.inject(ViewSlotRegistry).getViews(SettingsViewSlot.WorkspaceServicesFeedback)(),
    ).toHaveLength(1);
    expect(
      TestBed.inject(SettingsEditorRegistry).resolve({
        kind: 'teams-feedback',
        workspaceId: 'personal',
      }).id,
    ).toBe('feedback-channel-editor');
  });
});
