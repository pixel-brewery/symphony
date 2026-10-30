// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { AI_OPERATIONS } from '@symphony/frontend-core/ai';
import { NotificationService } from '@symphony/frontend-notification';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AiStore } from '../state/AiStore';
import { provideAiFeature } from './provideAiFeature';
import { AiContext } from '../adapters/AiContext';

// #endregion

describe('provideAiFeature', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('resolves the real aggregate bridge without a constructor cycle and exposes the same account activity to other settings consumers', async () => {
    // arrange
    let finish: (value: ResponsePayload<'codex.login.start'>) => void = () => {
      throw new Error('Login not started.');
    };
    const request = vi.fn(
      () =>
        new Promise<ResponsePayload<'codex.login.start'>>((resolve) => {
          finish = resolve;
        }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideAiFeature(),
        { provide: ORCHESTRATION_CLIENT, useValue: { request } },
        { provide: NotificationService, useValue: { showInfo: vi.fn() } },
      ],
    });
    const operations = TestBed.inject(AI_OPERATIONS);
    const bridge = TestBed.inject(AiContext);
    const login = operations.connectCodex({ mode: 'chatgpt', accountId: 'account-a' });
    const sharedBusy = bridge.configurationBusy();

    // act
    finish({ status: 'started', message: 'Continue sign-in.' });
    await login;

    // assert
    expect(operations).toBe(TestBed.inject(AiStore));
    expect(sharedBusy).toBe(true);
    expect(bridge.configurationBusy()).toBe(false);
    expect(bridge.editorBusy()).toBe(false);
  });
});
