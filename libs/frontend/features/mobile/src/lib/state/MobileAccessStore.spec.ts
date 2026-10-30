// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { MOBILE_ACCESS_OPERATIONS } from '@symphony/frontend-core/mobile-access';
import { NotificationService } from '@symphony/frontend-notification';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { MobileAccessStatus, MobilePairingChallenge } from '@symphony/mobile-contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMobileAccessClient } from '../ports/IMobileAccessClient';
import type { MobileAccessRequestMethod } from '../ports/MobileAccessRequestMethod';
import { provideMobileFeature } from '../provider/provideMobileFeature';
import { MobileAccessStore } from './MobileAccessStore';

// #endregion

const enabled: MobileAccessStatus = {
  enabled: true,
  state: 'available',
  origin: 'http://192.168.1.2:5678',
  pendingPairings: [],
  devices: [],
};
const disabled: MobileAccessStatus = {
  enabled: false,
  state: 'disabled',
  pendingPairings: [],
  devices: [],
};
const challenge: MobilePairingChallenge = {
  pairingUrl: 'http://192.168.1.2:5678/pair#pair=challenge',
  expiresAt: '2026-10-30T15:00:00.000Z',
};

function configureStore(
  handlers: Partial<{
    [M in MobileAccessRequestMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
  }>,
) {
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
  const showError = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideMobileFeature(),
      { provide: ORCHESTRATION_CLIENT, useValue: client },
      { provide: NotificationService, useValue: { showError } },
    ],
  });
  return {
    store: TestBed.inject(MobileAccessStore),
    owner: TestBed.inject(MOBILE_ACCESS_OPERATIONS),
    showError,
  };
}

describe('MobileAccessStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares pairing exclusion with desktop consumers and prevents an overlapping toggle', async () => {
    // arrange
    let completePairing: (value: MobilePairingChallenge) => void = () => undefined;
    const pairing = new Promise<MobilePairingChallenge>((resolve) => {
      completePairing = resolve;
    });
    const { store, owner, showError } = configureStore({
      'mobile-access.pairing.create': () => pairing,
    });

    // act
    const creation = owner.createMobilePairing();
    const toggled = await store.setMobileAccess(true);

    // assert
    expect(owner).toBe(store);
    expect(toggled).toBe(false);
    expect(owner.mobileAccessBusy()).toBe(true);
    completePairing(challenge);
    expect(await creation).toBe(true);
    expect(owner.mobilePairingChallenge()).toEqual(challenge);
    expect(store.mobileAccessBusy()).toBe(false);
    expect(showError).not.toHaveBeenCalled();
  });

  it('preserves a challenge after a failed disable and clears it only after access is disabled', async () => {
    // arrange
    const disable = vi
      .fn<() => Promise<MobileAccessStatus>>()
      .mockRejectedValueOnce(new Error('The desktop is reconnecting.'))
      .mockResolvedValue(disabled);
    const { store } = configureStore({
      'mobile-access.status.get': async () => enabled,
      'mobile-access.pairing.create': async () => challenge,
      'mobile-access.disable': disable,
    });
    await store.refreshMobileAccess();
    await store.createMobilePairing();

    // act
    const failed = await store.setMobileAccess(false);

    // assert
    expect(failed).toBe(false);
    expect(store.mobileAccessStatus()).toEqual(enabled);
    expect(store.mobilePairingChallenge()).toEqual(challenge);
    expect(store.mobileAccessBusy()).toBe(false);
    expect(await store.setMobileAccess(false)).toBe(true);
    expect(store.mobileAccessStatus()).toEqual(disabled);
    expect(store.mobilePairingChallenge()).toBeUndefined();
  });

  it('retains confirmed access state and suppresses only background refresh errors', async () => {
    // arrange
    const status = vi
      .fn<() => Promise<MobileAccessStatus>>()
      .mockResolvedValueOnce(enabled)
      .mockRejectedValue(new Error('The desktop is reconnecting.'));
    const { store, showError } = configureStore({ 'mobile-access.status.get': status });
    await store.refreshMobileAccess();

    // act
    await store.refreshMobileAccess(true);

    // assert
    expect(store.mobileAccessStatus()).toEqual(enabled);
    expect(showError).not.toHaveBeenCalled();
    await store.refreshMobileAccess();
    expect(showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to load mobile access.',
      'The desktop is reconnecting.',
    );
  });
});
