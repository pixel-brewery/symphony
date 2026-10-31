// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { MobileAccessStatus } from '@symphony/mobile-contracts';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MobileAccessStore } from '../state/MobileAccessStore';
import { MobilePairingNotificationSource } from './MobilePairingNotificationSource';

// #endregion

function status(enabled: boolean): MobileAccessStatus {
  return {
    enabled,
    state: enabled ? 'available' : 'disabled',
    pendingPairings: [
      {
        id: 'pairing-1',
        deviceName: 'Alex’s iPhone',
        verificationCode: '482913',
        requestedAt: '2026-10-30T10:00:00.000Z',
        expiresAt: '2026-10-30T10:05:00.000Z',
      },
    ],
    devices: [],
  };
}

function arrange(initial: MobileAccessStatus | undefined) {
  const current = signal(initial);
  const store = {
    mobileAccessStatus: current,
    refreshMobileAccess: vi.fn(async () => undefined),
    decideMobilePairing: vi.fn(async () => undefined),
  };
  TestBed.configureTestingModule({
    providers: [MobilePairingNotificationSource, { provide: MobileAccessStore, useValue: store }],
  });
  return { source: TestBed.inject(MobilePairingNotificationSource), store, current };
}

describe('MobilePairingNotificationSource', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('reports each pending pairing with its verification code and both decisions', () => {
    // arrange
    const { source } = arrange(status(true));
    // act
    const items = source.items();
    // assert
    expect(items).toEqual([
      {
        id: 'mobile-pairing:pairing-1',
        severity: 'info',
        title: 'Alex’s iPhone asks to pair',
        location: ['Mobile access'],
        detail: 'verification code 482913',
        scope: { kind: 'mac' },
        actions: [
          { id: 'reject', label: 'Reject', emphasis: 'danger' },
          { id: 'approve', label: 'Approve', emphasis: 'primary' },
        ],
      },
    ]);
  });

  it('reports nothing while mobile access is off', () => {
    // arrange
    const { source } = arrange(status(false));
    // act
    const items = source.items();
    // assert
    expect(items).toEqual([]);
  });

  it('approves and rejects with the existing pairing decision', async () => {
    // arrange
    const { source, store } = arrange(status(true));
    // act
    await source.perform('mobile-pairing:pairing-1', 'approve');
    await source.perform('mobile-pairing:pairing-1', 'reject');
    // assert
    expect(store.decideMobilePairing.mock.calls).toEqual([
      ['pairing-1', true],
      ['pairing-1', false],
    ]);
  });

  it('checks for requests often while access is on and rarely while it is off', async () => {
    // arrange
    vi.useFakeTimers();
    const { source, store, current } = arrange(status(true));
    // act
    source.connect();
    source.connect();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(4_000);
    current.set(status(false));
    await vi.advanceTimersByTimeAsync(4_000);
    await vi.advanceTimersByTimeAsync(30_000);
    // assert
    expect(store.refreshMobileAccess).toHaveBeenCalledTimes(3);
    expect(store.refreshMobileAccess).toHaveBeenCalledWith(true);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(store.refreshMobileAccess).toHaveBeenCalledTimes(3);
  });
});
