// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { INotificationMessage } from '../models/INotificationMessage';
import { NotificationHistory } from '../state/NotificationHistory';
import { NotificationService } from './NotificationService';

// #endregion

function arrange() {
  const push = vi.fn<(notification: INotificationMessage, repeated?: boolean) => void>();
  const history = new NotificationHistory({
    visibilityState: 'hidden',
    hasFocus: () => false,
  } as unknown as Document);
  const service = new NotificationService([{ push }, history]);
  return { service, push, history };
}

describe('NotificationService', () => {
  it('groups an unchanged resource error while forwarding every occurrence to the history', () => {
    // arrange
    const { service, push, history } = arrange();

    // act
    service.showError('Inspection failed', 'Workspace One › Example: invalid Git', 'repo:one');
    service.showError('Inspection failed', 'Workspace One › Example: invalid Git', 'repo:one');

    // assert
    expect(push).toHaveBeenNthCalledWith(1, {
      kind: 'error',
      title: 'Inspection failed',
      content: 'Workspace One › Example: invalid Git',
      groupKey: 'repo:one',
    });
    expect(push).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ groupKey: 'repo:one' }),
      true,
    );
    expect(history.notices()).toHaveLength(1);
    expect(history.notices()[0]).toMatchObject({ occurrences: 2, read: false });
  });

  it('allows changed failures, other resources and confirmed recurrence to notify', () => {
    // arrange
    const { service, push, history } = arrange();
    service.showError('Inspection failed', 'invalid Git', 'repo:one');

    // act
    service.showError('Inspection failed', 'access denied', 'repo:one');
    service.showError('Inspection failed', 'access denied', 'repo:two');
    service.resolveError('repo:one');
    service.showError('Inspection failed', 'access denied', 'repo:one');

    // assert
    expect(push.mock.calls.map((call) => call[1])).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(history.notices()).toHaveLength(3);
    expect(history.notices()[0]).toMatchObject({ groupKey: 'repo:one', occurrences: 2 });
  });

  it('does not silence independent operation errors without an owner episode key', () => {
    // arrange
    const { service, push, history } = arrange();

    // act
    service.showError('Save failed', 'Try again');
    service.showError('Save failed', 'Try again');

    // assert
    expect(push.mock.calls.map((call) => call[1])).toEqual([undefined, undefined]);
    expect(history.notices()).toHaveLength(1);
    expect(history.notices()[0]?.occurrences).toBe(2);
  });

  it('marks a fresh recurrence unread again after confirmed recovery while retaining its count', () => {
    // arrange
    const { service, history } = arrange();
    service.showError('Inspection failed', 'invalid Git', 'repo:one');
    history.markAllAsRead();
    service.showError('Inspection failed', 'invalid Git', 'repo:one');
    const repeatWasRead = history.notices()[0]?.read;

    // act
    service.resolveError('repo:one');
    service.showError('Inspection failed', 'invalid Git', 'repo:one');

    // assert
    expect(repeatWasRead).toBe(true);
    expect(history.notices()).toHaveLength(1);
    expect(history.notices()[0]).toMatchObject({ occurrences: 3, read: false });
  });

  it('bounds retained episode fingerprints and can notify an evicted old error again', () => {
    // arrange
    const { service, push } = arrange();

    // act
    for (let index = 0; index < 51; index++) {
      service.showError('Inspection failed', 'invalid Git', `repo:${index}`);
    }
    service.showError('Inspection failed', 'invalid Git', 'repo:0');

    // assert
    expect(push.mock.calls.at(-1)).toEqual([
      { kind: 'error', title: 'Inspection failed', content: 'invalid Git', groupKey: 'repo:0' },
    ]);
  });
});
