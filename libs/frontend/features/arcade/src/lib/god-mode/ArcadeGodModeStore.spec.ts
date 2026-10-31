// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { NotificationService } from '@symphony/frontend-notification';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArcadeGodModeStore } from './ArcadeGodModeStore';

// #endregion

vi.mock('@symphony/frontend-core', () => ({
  NotificationService: class NotificationService {},
}));

const CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
] as const;

function press(code: string, options: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    code,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
}

describe('ArcadeGodModeStore', () => {
  const showSuccess = vi.fn();

  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));

  beforeEach(() => {
    vi.useFakeTimers();
    showSuccess.mockReset();
    TestBed.configureTestingModule({
      providers: [ArcadeGodModeStore, { provide: NotificationService, useValue: { showSuccess } }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  afterAll(() => TestBed.resetTestEnvironment());

  it('activates once after the complete code without consuming its events', () => {
    // arrange
    const store = TestBed.inject(ArcadeGodModeStore);
    store.initialize();

    // act
    const progress = CODE.map((code) => {
      const event = press(code);
      return { event, progress: store.progress() };
    });
    CODE.forEach((code) => press(code));
    vi.advanceTimersByTime(2_000);

    // assert
    expect(store.enabled()).toBe(true);
    expect(store.progress()).toBe(CODE.length);
    expect(progress.map((entry) => entry.progress)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(store.sequence).toEqual(['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A']);
    expect(progress.every(({ event }) => !event.defaultPrevented)).toBe(true);
    expect(showSuccess).toHaveBeenCalledExactlyOnceWith('God mode activated');
  });

  it('requires an uninterrupted unmodified sequence and ignores key repeat', () => {
    // arrange
    const store = TestBed.inject(ArcadeGodModeStore);
    store.initialize();

    // act
    CODE.slice(0, 4).forEach((code) => press(code));
    press('KeyX');
    CODE.forEach((code, index) =>
      press(
        code,
        index === 1
          ? { repeat: true }
          : index === 4
            ? { metaKey: true }
            : index === 8
              ? { shiftKey: true }
              : {},
      ),
    );

    // assert
    expect(store.enabled()).toBe(false);
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('resets partial progress two seconds after the latest accepted key', () => {
    // arrange
    const store = TestBed.inject(ArcadeGodModeStore);
    store.initialize();

    // act
    press(CODE[0]);
    vi.advanceTimersByTime(1_999);
    press(CODE[1]);
    vi.advanceTimersByTime(1_999);

    // assert
    expect(store.progress()).toBe(2);

    // act
    vi.advanceTimersByTime(1);

    // assert
    expect(store.progress()).toBe(0);
    expect(store.enabled()).toBe(false);
  });

  it('enables god mode in every window once the code was entered in one of them', async () => {
    // arrange
    vi.useRealTimers();
    const store = TestBed.inject(ArcadeGodModeStore);
    store.initialize();
    const otherWindow = new BroadcastChannel('symphony.arcade-god-mode');

    // act
    otherWindow.postMessage({ kind: 'enabled' });
    await vi.waitFor(() => expect(store.enabled()).toBe(true));

    // assert
    expect(store.progress()).toBe(CODE.length);
    expect(showSuccess).not.toHaveBeenCalled();
    otherWindow.close();
  });

  it('tells another window that opens later that god mode is active', async () => {
    // arrange
    vi.useRealTimers();
    const store = TestBed.inject(ArcadeGodModeStore);
    store.initialize();
    for (const code of CODE) press(code);
    const replies: unknown[] = [];
    const laterWindow = new BroadcastChannel('symphony.arcade-god-mode');
    laterWindow.onmessage = (event) => replies.push(event.data);

    // act
    laterWindow.postMessage({ kind: 'query' });

    // assert
    await vi.waitFor(() => expect(replies).toContainEqual({ kind: 'enabled' }));
    laterWindow.close();
  });
});
