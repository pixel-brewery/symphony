// #region Imports

import { DOCUMENT } from '@angular/common';
import { computed, Inject, inject, Injectable, signal } from '@angular/core';
import type { INotificationInterceptor } from '../interception/INotificationInterceptor';
import type { INotificationMessage } from '../models/INotificationMessage';
import type { INotificationNotice } from '../models/INotificationNotice';

// #endregion

const MAXIMUM_NOTICES = 50;

/**
 * Keeps the toasts this window shows as today's history for the notification centre. It is a
 * notification interceptor beside the toast interceptor, so every `NotificationService` message
 * is represented without changing its callers. Matching errors share one counted notice.
 * The history lives in memory for the day.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class NotificationHistory implements INotificationInterceptor {
  // #region Fields

  private readonly _document: Document;
  private readonly _notices = signal<readonly INotificationNotice[]>([]);
  private _sequence = 0;

  /**
   * Today's notices, newest first.
   *
   * @public
   * @readonly
   */
  public readonly notices = this._notices.asReadonly();

  /**
   * Number of notices shown while the window was not in front.
   *
   * @public
   * @readonly
   */
  public readonly unreadCount = computed(
    () => this._notices().filter((notice) => !notice.read).length,
  );

  /**
   * Number of notices `Clear read` would remove.
   *
   * @public
   * @readonly
   */
  public readonly readCount = computed(
    () => this._notices().filter((notice) => notice.read).length,
  );

  // #endregion

  // #region Ctor

  /**
   * Constructs the history for the current window.
   *
   * @param document - The window's document, used to tell whether a toast was seen.
   * @public
   */
  public constructor(@Inject(DOCUMENT) document: Document = inject(DOCUMENT)) {
    this._document = document;
  }

  // #endregion

  // #region Methods

  /**
   * Records a message and combines matching errors without changing an existing read state.
   * A first message shown while the window was in front counts as read.
   *
   * @param notification - The message the toast shows.
   * @param repeated - Whether an owned error remains in the same unresolved episode.
   * @public
   */
  public push(notification: INotificationMessage, repeated = false): void {
    const now = Date.now();
    const today = this._notices().filter((entry) => entry.occurredAt >= startOfDay(now));
    const previous =
      notification.kind === 'error'
        ? today.find(
            (entry) =>
              entry.kind === 'error' &&
              entry.groupKey === notification.groupKey &&
              entry.title === notification.title &&
              entry.content === notification.content,
          )
        : undefined;
    const notice: INotificationNotice = {
      id: previous?.id ?? `notice-${++this._sequence}`,
      kind: notification.kind,
      title: notification.title,
      content: notification.content,
      ...(notification.groupKey ? { groupKey: notification.groupKey } : {}),
      occurrences: Math.min(Number.MAX_SAFE_INTEGER, (previous?.occurrences ?? 0) + 1),
      occurredAt: now,
      read:
        previous && (!notification.groupKey || repeated) ? previous.read : this.isWindowInFront(),
    };
    this._notices.set(
      [notice, ...today.filter((entry) => entry.id !== notice.id)].slice(0, MAXIMUM_NOTICES),
    );
  }

  /**
   * Marks every notice as read.
   *
   * @public
   */
  public markAllAsRead(): void {
    if (!this.unreadCount()) return;
    this._notices.update((notices) =>
      notices.map((notice) => (notice.read ? notice : { ...notice, read: true })),
    );
  }

  /**
   * Removes every read notice.
   *
   * @public
   */
  public clearRead(): void {
    if (!this.readCount()) return;
    this._notices.update((notices) => notices.filter((notice) => !notice.read));
  }

  /**
   * Drops notices from before today.
   *
   * @param now - Current time in epoch milliseconds.
   * @public
   */
  public prune(now: number): void {
    const start = startOfDay(now);
    if (this._notices().every((notice) => notice.occurredAt >= start)) return;
    this._notices.update((notices) => notices.filter((notice) => notice.occurredAt >= start));
  }

  private isWindowInFront(): boolean {
    return this._document.visibilityState !== 'hidden' && this._document.hasFocus();
  }

  // #endregion
}

function startOfDay(time: number): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}
