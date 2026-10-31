// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationHistory } from './NotificationHistory';

// #endregion

function arrange(inFront = true): NotificationHistory {
  const document = {
    visibilityState: inFront ? 'visible' : 'hidden',
    hasFocus: () => inFront,
  } as unknown as Document;
  return new NotificationHistory(document);
}

describe('NotificationHistory', () => {
  afterEach(() => vi.useRealTimers());

  it('records each toast as a notice, newest first, read when the window was in front', () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 30, 10, 42));
    const history = arrange();
    // act
    history.push({ kind: 'success', title: 'Repository prepared locally.', content: '' });
    vi.setSystemTime(new Date(2026, 9, 30, 11, 0));
    history.push({ kind: 'info', title: 'Guest image updated.', content: 'Ubuntu 24.04' });
    // assert
    expect(history.notices().map((notice) => notice.title)).toEqual([
      'Guest image updated.',
      'Repository prepared locally.',
    ]);
    expect(history.notices()[0]).toMatchObject({
      kind: 'info',
      content: 'Ubuntu 24.04',
      occurredAt: new Date(2026, 9, 30, 11, 0).getTime(),
      read: true,
    });
    expect(history.unreadCount()).toBe(0);
    expect(history.readCount()).toBe(2);
  });

  it('keeps toasts shown while the window was in the background unread until marked read', () => {
    // arrange
    const history = arrange(false);
    history.push({ kind: 'error', title: 'Unable to load orchestration state.', content: '' });
    // act
    const unreadBefore = history.unreadCount();
    history.markAllAsRead();
    // assert
    expect(unreadBefore).toBe(1);
    expect(history.unreadCount()).toBe(0);
    expect(history.notices()[0]?.read).toBe(true);
  });

  it('clears only read notices', () => {
    // arrange
    const history = arrange();
    history.push({ kind: 'success', title: 'Settings saved.', content: '' });
    const background = arrange(false);
    background.push({ kind: 'warning', title: 'Unread', content: '' });
    // act
    history.clearRead();
    background.clearRead();
    // assert
    expect(history.notices()).toEqual([]);
    expect(background.notices().map((notice) => notice.title)).toEqual(['Unread']);
  });

  it('keeps only today and at most fifty notices', () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 29, 23, 50));
    const history = arrange();
    history.push({ kind: 'info', title: 'Yesterday', content: '' });
    vi.setSystemTime(new Date(2026, 9, 30, 8, 0));
    // act
    history.prune(Date.now());
    for (let index = 0; index < 55; index++) {
      history.push({ kind: 'info', title: `Notice ${index}`, content: '' });
    }
    // assert
    expect(history.notices()).toHaveLength(50);
    expect(history.notices().some((notice) => notice.title === 'Yesterday')).toBe(false);
    expect(history.notices()[0]?.title).toBe('Notice 54');
  });
});
