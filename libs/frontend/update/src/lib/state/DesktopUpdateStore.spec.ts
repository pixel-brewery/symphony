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

const available: UpdateState = {
  kind: 'available',
  currentVersion: '0.1.10',
  targetVersion: '0.1.11',
  channel: 'stable',
  lastCheckedAt: '2026-09-07T12:00:00.000Z',
};

function configureStore(downloadOutcome: 'started' | 'opened' | 'not-available'): {
  readonly request: ReturnType<typeof vi.fn>;
  readonly publish: (state: UpdateState) => void;
  readonly notifications: Record<
    'showInfo' | 'showWarning' | 'showError' | 'showSuccess',
    ReturnType<typeof vi.fn>
  >;
} {
  const request = vi.fn(async (method: string) => {
    if (method === 'updates.get') return available;
    if (method === 'updates.download') return { outcome: downloadOutcome };
    throw new Error(`Unexpected request ${method}.`);
  });
  let listener: ((state: UpdateState) => void) | undefined;
  const notifications = {
    showInfo: vi.fn(),
    showWarning: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      DesktopUpdateStore,
      {
        provide: DESKTOP_CLIENT,
        useValue: {
          capabilities: { speechRecognition: false },
          request,
          onUpdateState: (next: (state: UpdateState) => void) => {
            listener = next;
            return () => undefined;
          },
        } as unknown as IDesktopApi,
      },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { request, publish: (state) => listener?.(state), notifications };
}

describe('DesktopUpdateStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('starts the in-app download without a toast, leaving the progress to the status bar', async () => {
    // arrange
    const { request, notifications } = configureStore('started');
    const store = TestBed.inject(DesktopUpdateStore);
    await store.initialize();

    // act
    await store.download();

    // assert
    expect(request).toHaveBeenLastCalledWith('updates.download', {});
    expect(notifications.showInfo).not.toHaveBeenCalled();
    expect(notifications.showWarning).not.toHaveBeenCalled();
    expect(notifications.showError).not.toHaveBeenCalled();
    expect(store.busy()).toBe(false);
  });

  it('says why a download it started failed, because the status-bar button disappears', async () => {
    // arrange
    const { publish, notifications } = configureStore('started');
    const store = TestBed.inject(DesktopUpdateStore);
    await store.initialize();
    await store.download();

    // act
    publish({ ...available, kind: 'downloading', progress: 0.4 });
    publish({
      kind: 'failed',
      currentVersion: '0.1.10',
      channel: 'stable',
      code: 'DOWNLOAD_FAILED',
      message: 'Symphony could not download the available update.',
    });

    // assert
    expect(notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'The update could not be downloaded.',
      'Symphony could not download the available update.',
    );
  });

  it('announces the browser fallback when Main opened the installer download instead', async () => {
    // arrange
    const { request, notifications } = configureStore('opened');
    const store = TestBed.inject(DesktopUpdateStore);
    await store.initialize();

    // act
    await store.download();

    // assert
    expect(request).toHaveBeenLastCalledWith('updates.download', {});
    expect(notifications.showInfo).toHaveBeenCalledWith(
      'Update download opened.',
      'Install Symphony 0.1.11 from the downloaded installer.',
    );
  });

  it('warns when no update is available to download', async () => {
    // arrange
    const { notifications } = configureStore('not-available');
    const store = TestBed.inject(DesktopUpdateStore);
    await store.initialize();

    // act
    await store.download();

    // assert
    expect(notifications.showWarning).toHaveBeenCalledWith('No update is available to download.');
    expect(notifications.showInfo).not.toHaveBeenCalled();
  });
});
