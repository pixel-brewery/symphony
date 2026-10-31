// @vitest-environment jsdom

// #region Imports

import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { NotificationService } from '@symphony/frontend-notification';
import type { UpdateState } from '@symphony/ipc-contracts-desktop';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DesktopUpdateStore } from '../state/DesktopUpdateStore';
import { provideUpdate } from './provideUpdate';

// #endregion

describe('provideUpdate', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('initializes the single existing update owner once and releases its native event subscription', async () => {
    // arrange
    const state: UpdateState = { kind: 'idle', currentVersion: '0.1.16', channel: 'stable' };
    const request = vi.fn(async () => state);
    const unsubscribe = vi.fn();
    const onUpdateState = vi.fn(() => unsubscribe);
    TestBed.configureTestingModule({
      providers: [
        provideUpdate(),
        { provide: DESKTOP_CLIENT, useValue: { request, onUpdateState } },
        { provide: NotificationService, useValue: {} },
      ],
    });

    // act
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const store = TestBed.inject(DesktopUpdateStore);
    const first = store.initialize();
    const second = store.initialize();
    await Promise.all([first, second]);
    const current = store.state();
    TestBed.resetTestingModule();

    // assert
    expect(first).toBe(second);
    expect(current).toEqual(state);
    expect(request).toHaveBeenCalledExactlyOnceWith('updates.get', {});
    expect(onUpdateState).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
