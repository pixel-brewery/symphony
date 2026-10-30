// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { IDesktopApi, UpdateState } from '@symphony/ipc-contracts-desktop';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { NotificationService } from '@symphony/frontend-notification';
import { DesktopUpdateStore } from './DesktopUpdateStore';

// #endregion

describe('DesktopUpdateStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('opens the Main-owned download for an available installer', async () => {
    // arrange
    const available: UpdateState = {
      kind: 'available',
      currentVersion: '0.1.10',
      targetVersion: '0.1.11',
      channel: 'stable',
      lastCheckedAt: '2026-09-07T12:00:00.000Z',
    };
    const request = vi.fn(async (method: string) => {
      if (method === 'updates.get') return available;
      if (method === 'updates.download') return { outcome: 'opened' };
      throw new Error(`Unexpected request ${method}.`);
    });
    const showInfo = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        DesktopUpdateStore,
        {
          provide: DESKTOP_CLIENT,
          useValue: {
            capabilities: { speechRecognition: false },
            request,
            onUpdateState: () => () => undefined,
          } as unknown as IDesktopApi,
        },
        {
          provide: NotificationService,
          useValue: {
            showInfo,
            showWarning: vi.fn(),
            showError: vi.fn(),
            showSuccess: vi.fn(),
          },
        },
      ],
    });
    const store = TestBed.inject(DesktopUpdateStore);
    await store.initialize();

    // act
    await store.download();

    // assert
    expect(request).toHaveBeenLastCalledWith('updates.download', {});
    expect(showInfo).toHaveBeenCalledWith(
      'Update download opened.',
      'Install Symphony 0.1.11 from the downloaded installer.',
    );
  });
});
