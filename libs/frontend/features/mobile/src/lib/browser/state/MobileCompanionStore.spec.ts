// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IMobileCompanionClient } from '../clients/interfaces/IMobileCompanionClient';
import type { MobileCompanionConnectionState } from '../clients/MobileCompanionConnectionState';
import { MOBILE_COMPANION_CLIENT } from '../clients/MOBILE_COMPANION_CLIENT';
import { MobileCompanionStore } from './MobileCompanionStore';
// #endregion

const snapshot = {
  version: 1,
  desktopName: 'Symphony',
  generatedAt: '2026-01-01T00:00:00.000Z',
  boardColumns: [],
  tickets: [],
  executions: [],
  executionQueue: [],
};
afterEach(() => TestBed.resetTestingModule());

function fixture() {
  let transition: (state: MobileCompanionConnectionState) => void = () => undefined;
  let eventHandlers: Parameters<IMobileCompanionClient['connectEvents']>[1] | undefined;
  const unsubscribe = vi.fn();
  const close = vi.fn();
  const dispose = vi.fn(async () => undefined);
  const client: IMobileCompanionClient = {
    initialize: vi.fn(async () => true),
    request: vi.fn(async () => ({ ok: true, status: 200, body: snapshot })),
    subscribeConnection: (listener) => {
      transition = listener;
      return unsubscribe;
    },
    connectEvents: vi.fn((_route, handlers) => {
      eventHandlers = handlers;
      return close;
    }),
    createOperationId: () => 'operation-1',
    dispose,
  };
  TestBed.configureTestingModule({
    providers: [MobileCompanionStore, { provide: MOBILE_COMPANION_CLIENT, useValue: client }],
  });
  return {
    store: TestBed.inject(MobileCompanionStore),
    client,
    transition: (state: MobileCompanionConnectionState) => transition(state),
    close,
    unsubscribe,
    dispose,
    openEvents: () => eventHandlers?.open(),
    closeEvents: () => eventHandlers?.close(),
  };
}

describe('MobileCompanionStore', () => {
  it('uses SDK pairing evidence and reads the product snapshot without a second approval protocol', async () => {
    // arrange
    const value = fixture();
    // act
    await value.store.initialize();
    // assert
    expect(value.store.pairingState()).toBe('approved');
    expect(value.store.snapshot()?.desktopName).toBe('Symphony');
    expect(value.client.initialize).toHaveBeenCalledTimes(1);
    expect(value.client.request).toHaveBeenCalledExactlyOnceWith('/api/mobile/v1/snapshot');
  });

  it('clears revoked projections and rejects a late snapshot from the preceding connection generation', async () => {
    // arrange
    const value = fixture();
    await value.store.initialize();
    let finish!: (response: { ok: boolean; status: number; body: unknown }) => void;
    value.client.request = () =>
      new Promise((complete) => {
        finish = complete;
      });
    const read = value.store.refreshSnapshot();
    // act
    value.transition('required');
    finish({ ok: true, status: 200, body: snapshot });
    await read;
    // assert
    expect(value.store.snapshot()).toBeUndefined();
    expect(value.store.pairingState()).toBe('required');
    expect(value.close).toHaveBeenCalledTimes(1);
  });

  it('reconciles a fresh snapshot whenever the SDK event channel opens or recovers', async () => {
    // arrange
    const value = fixture();
    await value.store.initialize();
    // act
    value.openEvents();
    await Promise.resolve();
    // assert
    expect(value.client.request).toHaveBeenCalledTimes(2);
    expect(value.client.connectEvents).toHaveBeenCalledTimes(1);
  });

  it('keeps verified pairing after an initial snapshot failure and recovers with an explicit retry', async () => {
    // arrange
    const value = fixture();
    value.client.request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        body: { code: 'MOBILE_RESPONSE_INVALID', message: 'The snapshot could not be prepared.' },
      })
      .mockResolvedValue({ ok: true, status: 200, body: snapshot });

    // act
    await value.store.initialize();

    // assert
    expect(value.store.pairingState()).toBe('approved');
    expect(value.store.snapshot()).toBeUndefined();
    expect(value.store.error()).toBe('The snapshot could not be prepared.');
    expect(value.client.connectEvents).not.toHaveBeenCalled();

    // act
    await value.store.retry();

    // assert
    expect(value.store.pairingState()).toBe('approved');
    expect(value.store.snapshot()?.desktopName).toBe('Symphony');
    expect(value.store.error()).toBeUndefined();
    expect(value.client.request).toHaveBeenCalledTimes(2);
    expect(value.client.connectEvents).toHaveBeenCalledTimes(1);
  });

  it('replaces a closed SDK event owner on explicit retry and reconciles its next opening', async () => {
    // arrange
    const value = fixture();
    await value.store.initialize();
    value.client.request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        body: { code: 'MOBILE_REQUEST_FAILED', message: 'The desktop is temporarily unavailable.' },
      })
      .mockResolvedValue({ ok: true, status: 200, body: snapshot });
    value.closeEvents();
    await vi.waitFor(() =>
      expect(value.store.error()).toBe('The desktop is temporarily unavailable.'),
    );

    // act
    await value.store.retry();

    // assert
    expect(value.close).toHaveBeenCalledTimes(1);
    expect(value.client.connectEvents).toHaveBeenCalledTimes(2);
    expect(value.store.snapshot()?.desktopName).toBe('Symphony');
    expect(value.store.error()).toBeUndefined();

    // act
    value.openEvents();
    await vi.waitFor(() => expect(value.client.request).toHaveBeenCalledTimes(3));

    // assert
    expect(value.client.connectEvents).toHaveBeenCalledTimes(2);
  });

  it('cannot restore creation metadata from a request completed after device revocation', async () => {
    // arrange
    const value = fixture();
    await value.store.initialize();
    let finish!: (response: { ok: boolean; status: number; body: unknown }) => void;
    value.client.request = () =>
      new Promise((complete) => {
        finish = complete;
      });
    const read = value.store.loadWorkItemCreationContext();
    // act
    value.transition('required');
    finish({ ok: true, status: 200, body: { version: 1 } });
    // assert
    expect(await read).toBe(false);
    expect(value.store.workItemCreationContext()).toBeUndefined();
    expect(value.store.pairingState()).toBe('required');
  });

  it('disposes event and session ownership when the Angular store is destroyed', async () => {
    // arrange
    const value = fixture();
    await value.store.initialize();
    // act
    TestBed.resetTestingModule();
    // assert
    expect(value.close).toHaveBeenCalledTimes(1);
    expect(value.unsubscribe).toHaveBeenCalledTimes(1);
    expect(value.dispose).toHaveBeenCalledTimes(1);
  });
});
