// #region Imports

import { TestBed } from '@angular/core/testing';
import { mobileHttpRoutes } from '@symphony/mobile-contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMobileCompanionClient } from '../clients/IMobileCompanionClient';
import { MOBILE_COMPANION_CLIENT } from '../clients/MobileCompanionClient';
import { MobileCompanionStore } from './MobileCompanionStore';

// #endregion

describe('MobileCompanionStore pairing recovery', () => {
  const challenge = 'a'.repeat(43);

  beforeEach(() => {
    history.replaceState(null, '', `/pair#pair=${challenge}`);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    history.replaceState(null, '', '/');
  });

  it('reuses the fragment challenge after the mobile page reloads', async () => {
    // arrange
    const proposal = {
      pairingId: 'pairing-1',
      verificationCode: '123456',
      expiresAt: '2026-09-01T06:00:00.000Z',
    };
    const fetchRequest = vi.fn<typeof fetch>();
    fetchRequest.mockResolvedValue(
      new Response(JSON.stringify(proposal), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchRequest);
    TestBed.configureTestingModule({ providers: [MobileCompanionStore] });
    const initialStore = TestBed.inject(MobileCompanionStore);
    await initialStore.initialize();
    TestBed.resetTestingModule();

    fetchRequest.mockResolvedValue(
      new Response(JSON.stringify(proposal), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      }),
    );
    TestBed.configureTestingModule({ providers: [MobileCompanionStore] });
    const restoredStore = TestBed.inject(MobileCompanionStore);

    // act
    await restoredStore.initialize();

    // assert
    expect(fetchRequest).toHaveBeenLastCalledWith(
      mobileHttpRoutes.pairingPropose,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const lastRequest = fetchRequest.mock.calls.at(-1)?.[1];
    expect(JSON.parse(String(lastRequest?.body))).toEqual({
      challenge,
      deviceName: expect.any(String),
    });
    expect(restoredStore.pairing()).toEqual(proposal);
    expect(restoredStore.pairingState()).toBe('waiting');
    expect(location.hash).toBe(`#pair=${challenge}`);
  });

  it('cancels a pending pairing poll when the browser store is destroyed', async () => {
    // arrange
    const schedule = vi.fn<IMobileCompanionClient['schedule']>().mockReturnValue(73);
    const cancel = vi.fn<IMobileCompanionClient['cancel']>();
    const client: IMobileCompanionClient = {
      request: async () => ({
        ok: true,
        status: 202,
        body: {
          pairingId: 'pairing-1',
          verificationCode: '123456',
          expiresAt: '2026-10-30T15:00:00.000Z',
        },
      }),
      connectEvents: () => () => undefined,
      pairingChallenge: () => challenge,
      clearPairingChallenge: vi.fn(),
      deviceName: () => 'Test phone',
      createOperationId: () => 'operation-1',
      schedule,
      cancel,
    };
    TestBed.configureTestingModule({
      providers: [MobileCompanionStore, { provide: MOBILE_COMPANION_CLIENT, useValue: client }],
    });
    const store = TestBed.inject(MobileCompanionStore);
    await store.initialize();

    // act
    TestBed.resetTestingModule();

    // assert
    expect(schedule).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 1_000);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(73);
  });
});
