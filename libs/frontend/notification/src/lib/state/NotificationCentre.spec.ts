// #region Imports

import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { INotificationItem } from '../models/INotificationItem';
import type { INotificationSource } from '../sources/INotificationSource';
import { NotificationCentre } from './NotificationCentre';
import { NotificationHistory } from './NotificationHistory';

// #endregion

function item(id: string, severity: INotificationItem['severity']): INotificationItem {
  return {
    id,
    severity,
    title: id,
    location: ['System'],
    scope: { kind: 'mac' },
    actions: [{ id: 'fix', label: 'Fix', emphasis: 'primary' }],
  };
}

function source(items: readonly INotificationItem[]) {
  const state = signal(items);
  return {
    state,
    items: state.asReadonly(),
    refresh: vi.fn(async () => undefined),
    connect: vi.fn(),
    perform: vi.fn(async () => undefined),
  } satisfies INotificationSource & { state: typeof state };
}

function arrange(...sources: INotificationSource[]) {
  const history = new NotificationHistory({
    visibilityState: 'visible',
    hasFocus: () => true,
  } as unknown as Document);
  return { centre: new NotificationCentre(sources, history), history };
}

describe('NotificationCentre', () => {
  afterEach(() => vi.useRealTimers());

  it('gathers every source, most severe first and in source order within a severity', () => {
    // arrange
    const first = source([item('pairing', 'info'), item('repository', 'warning')]);
    const second = source([item('codex', 'error'), item('account', 'warning')]);
    // act
    const { centre } = arrange(first, second);
    // assert
    expect(centre.items().map((entry) => entry.id)).toEqual([
      'codex',
      'repository',
      'account',
      'pairing',
    ]);
    expect(centre.attentionCount()).toBe(4);
    expect(centre.unreadCount()).toBe(4);
  });

  it('marks problems and notices read without removing a problem that still exists', () => {
    // arrange
    const owner = source([item('codex', 'error')]);
    const { centre, history } = arrange(owner);
    history.push({ kind: 'success', title: 'Settings saved.', content: '' });
    // act
    centre.markAllAsRead();
    // assert
    expect(centre.readItemIds().has('codex')).toBe(true);
    expect(centre.attentionCount()).toBe(1);
    expect(centre.unreadCount()).toBe(0);
    expect(centre.readNoticeCount()).toBe(1);
    centre.clearRead();
    expect(centre.notices()).toEqual([]);
    expect(centre.items()).toHaveLength(1);
  });

  it('forgets the read mark of a problem that went away, so its return is new', () => {
    // arrange
    const owner = source([item('codex', 'error')]);
    const { centre } = arrange(owner);
    centre.markAllAsRead();
    owner.state.set([]);
    // act
    centre.prune();
    owner.state.set([item('codex', 'error')]);
    // assert
    expect(centre.readItemIds().size).toBe(0);
    expect(centre.unreadCount()).toBe(1);
  });

  it('performs a fix through the source that contributed the item and marks it read', async () => {
    // arrange
    const first = source([item('pairing', 'info')]);
    const second = source([item('codex', 'error')]);
    const { centre } = arrange(first, second);
    // act
    await centre.perform('codex', 'fix');
    await centre.perform('unknown', 'fix');
    // assert
    expect(second.perform).toHaveBeenCalledExactlyOnceWith('codex', 'fix');
    expect(first.perform).not.toHaveBeenCalled();
    expect(centre.readItemIds().has('codex')).toBe(true);
  });

  it('connects sources once and shares refreshes that follow each other closely', async () => {
    // arrange
    vi.useFakeTimers();
    const owner = source([]);
    const { centre } = arrange(owner, { items: signal([]).asReadonly(), perform: vi.fn() });
    // act
    centre.connect();
    centre.connect();
    await Promise.all([centre.refresh(), centre.refresh()]);
    await centre.refresh();
    vi.advanceTimersByTime(10_000);
    await centre.refresh();
    // assert
    expect(owner.connect).toHaveBeenCalledOnce();
    expect(owner.refresh).toHaveBeenCalledTimes(2);
  });

  it('keeps the last items of a source whose refresh fails', async () => {
    // arrange
    const owner = source([item('codex', 'error')]);
    owner.refresh.mockRejectedValueOnce(new Error('offline'));
    const { centre } = arrange(owner);
    // act
    await centre.refresh();
    // assert
    expect(centre.items().map((entry) => entry.id)).toEqual(['codex']);
  });
});
