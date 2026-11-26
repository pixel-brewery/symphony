// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { SettingsAlertService } from '@symphony/frontend-setting';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { MobileAccessStatus } from '@symphony/mobile-contracts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMobileAccessClient } from '../ports/interfaces/IMobileAccessClient';
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

  it('loads once when mounted, follows change notices and reads nothing on a timer', async () => {
    // arrange
    let devices: MobileAccessStatus['devices'] = [];
    const readStatus = vi.fn(async (): Promise<MobileAccessStatus> => ({
      enabled: true,
      state: 'available',
      pendingPairings: [],
      devices,
    }));
    const handlers: Partial<{
      [M in MobileAccessRequestMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
    }> = { 'mobile-access.status.get': readStatus };
    let notify: () => void = () => undefined;
    const client: IMobileAccessClient = {
      onMobileAccessChanged(listener) {
        notify = listener;
        return () => {
          notify = () => undefined;
        };
      },
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
        { provide: SettingsAlertService, useValue: { confirm: vi.fn() } },
      ],
    });
    const presenter = TestBed.inject(MobileSettingsCardViewPresenter);
    presenter.initialize();
    await vi.advanceTimersByTimeAsync(60_000);
    const readsWhileIdle = readStatus.mock.calls.length;

    // act
    devices = [
      { id: 'phone', name: 'Phone', pairedAt: '2026-10-30T08:00:00.000Z', connected: true },
    ];
    notify();
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(readsWhileIdle).toBe(1);
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(presenter.mobileAccess()?.devices).toEqual(devices);
    TestBed.resetTestingModule();
    expect(presenter.disposed()).toBe(true);
  });

  it('revokes a paired phone only after a destructive confirmation', async () => {
    // arrange
    const status: MobileAccessStatus = {
      enabled: true,
      state: 'available',
      pendingPairings: [],
      devices: [
        {
          id: 'phone',
          name: 'Alex’s iPhone',
          pairedAt: '2026-10-30T08:00:00.000Z',
          connected: true,
        },
      ],
    };
    const revoke = vi.fn(async () => ({ ...status, devices: [] }));
    const handlers: Partial<{
      [M in MobileAccessRequestMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
    }> = {
      'mobile-access.status.get': async () => status,
      'mobile-access.device.revoke': revoke,
    };
    const client: IMobileAccessClient = {
      onMobileAccessChanged: () => () => undefined,
      async request<M extends MobileAccessRequestMethod>(
        method: M,
        payload: RequestPayload<M>,
      ): Promise<ResponsePayload<M>> {
        const handler = handlers[method];
        if (!handler) throw new Error('Unexpected request: ' + method);
        return handler(payload);
      },
    };
    const confirm = vi
      .fn<SettingsAlertService['confirm']>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    TestBed.configureTestingModule({
      providers: [
        provideMobileFeature(),
        MobileSettingsCardViewPresenter,
        { provide: ORCHESTRATION_CLIENT, useValue: client },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        { provide: SettingsAlertService, useValue: { confirm } },
      ],
    });
    const presenter = TestBed.inject(MobileSettingsCardViewPresenter);
    await TestBed.inject(MobileAccessStore).refreshMobileAccess(true);
    presenter.revokeMobileDeviceCommand.execute('phone');
    await vi.advanceTimersByTimeAsync(0);
    expect(revoke).not.toHaveBeenCalled();

    // act
    presenter.revokeMobileDeviceCommand.execute('phone');
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(confirm.mock.calls[0]?.[0]).toMatchObject({
      header: 'Revoke Alex’s iPhone?',
      tone: 'danger',
      confirmLabel: 'Revoke',
      destructive: true,
    });
    expect(revoke).toHaveBeenCalledExactlyOnceWith({ deviceId: 'phone' });
    expect(presenter.mobileAccess()?.devices).toEqual([]);
  });
});
