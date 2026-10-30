// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { MobileAccessStatus } from '@symphony/mobile-contracts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMobileAccessClient } from '../ports/IMobileAccessClient';
import type { MobileAccessRequestMethod } from '../ports/MobileAccessRequestMethod';
import { provideMobileFeature } from '../provider/provideMobileFeature';
import { MobileAccessStore } from '../state/MobileAccessStore';
import { MobileSettingsCardViewPresenter } from './MobileSettingsCardViewPresenter';

// #endregion

describe('MobileSettingsCardViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers();
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('polls only while access is enabled and stops when the mounted card is destroyed', async () => {
    // arrange
    let enabled = false;
    const status = (): MobileAccessStatus => ({
      enabled,
      state: enabled ? 'available' : 'disabled',
      pendingPairings: [],
      devices: [],
    });
    const readStatus = vi.fn(async () => status());
    const handlers: Partial<{
      [M in MobileAccessRequestMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
    }> = {
      'mobile-access.status.get': readStatus,
      'mobile-access.enable': async () => {
        enabled = true;
        return status();
      },
    };
    const client: IMobileAccessClient = {
      async request<M extends MobileAccessRequestMethod>(
        method: M,
        payload: RequestPayload<M>,
      ): Promise<ResponsePayload<M>> {
        const handler = handlers[method];
        if (!handler) throw new Error('Unexpected request: ' + method);
        return handler(payload);
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideMobileFeature(),
        MobileSettingsCardViewPresenter,
        { provide: ORCHESTRATION_CLIENT, useValue: client },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
      ],
    });
    const presenter = TestBed.inject(MobileSettingsCardViewPresenter);
    const store = TestBed.inject(MobileAccessStore);
    presenter.initialize();
    await vi.advanceTimersByTimeAsync(0);

    // act
    await vi.advanceTimersByTimeAsync(2_000);

    // assert
    expect(readStatus).toHaveBeenCalledOnce();
    await store.setMobileAccess(true);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(presenter.mobileAccess()).toBe(store.mobileAccessStatus());
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(4_000);
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(presenter.disposed()).toBe(true);
  });
});
