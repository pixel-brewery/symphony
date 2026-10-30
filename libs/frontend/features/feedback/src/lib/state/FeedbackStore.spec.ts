// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { NotificationService } from '@symphony/frontend-notification';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_CLIENT } from '../ports/FeedbackClientToken';
import type { IFeedbackClient } from '../ports/IFeedbackClient';
import { FeedbackStore } from './FeedbackStore';

// #endregion

const source: RequestPayload<'feedback-intake.test'>['source'] = {
  id: 'feedback',
  workspaceId: 'personal',
  displayName: 'Feedback',
  provider: 'microsoft-teams',
  tenantId: '00000000-0000-4000-8000-000000000001',
  clientId: '00000000-0000-4000-8000-000000000002',
  credentialRef: 'env:TEAMS_FEEDBACK_CLIENT_SECRET',
  teamId: '00000000-0000-4000-8000-000000000003',
  channelId: 'channel',
  targetWorkItemSourceId: 'project',
  targetRepositoryBindingId: 'repository',
  enabled: false,
};

describe('FeedbackStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares the connection-test lifecycle until the original validated request settles', async () => {
    // arrange
    let complete: (response: ResponsePayload<'feedback-intake.test'>) => void = () => undefined;
    const pending = new Promise<ResponsePayload<'feedback-intake.test'>>((resolve) => {
      complete = resolve;
    });
    const request = vi.fn<IFeedbackClient['request']>().mockReturnValue(pending);
    const showSuccess = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FeedbackStore,
        { provide: FEEDBACK_CLIENT, useValue: { request } satisfies IFeedbackClient },
        { provide: NotificationService, useValue: { showSuccess, showError: vi.fn() } },
      ],
    });
    const store = TestBed.inject(FeedbackStore);

    // act
    const result = store.testFeedbackIntake(source);
    const busyBeforeReply = store.feedbackIntakeTestBusy();
    complete({ status: 'completed', message: 'Channel read.' });

    // assert
    expect(await result).toBe(true);
    expect(busyBeforeReply).toBe(true);
    expect(store.feedbackIntakeTestBusy()).toBe(false);
    expect(request).toHaveBeenCalledExactlyOnceWith('feedback-intake.test', { source });
    expect(showSuccess).toHaveBeenCalledExactlyOnceWith('Channel read.');
  });

  it('releases the lifecycle and reports the existing channel failure without throwing', async () => {
    // arrange
    const request = vi
      .fn<IFeedbackClient['request']>()
      .mockRejectedValue(new Error('Channel unavailable.'));
    const showError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FeedbackStore,
        { provide: FEEDBACK_CLIENT, useValue: { request } satisfies IFeedbackClient },
        { provide: NotificationService, useValue: { showSuccess: vi.fn(), showError } },
      ],
    });
    const store = TestBed.inject(FeedbackStore);

    // act
    const result = await store.testFeedbackIntake(source);

    // assert
    expect(result).toBe(false);
    expect(store.feedbackIntakeTestBusy()).toBe(false);
    expect(showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to read the configured Microsoft Teams channel.',
      'Channel unavailable.',
    );
  });
});
