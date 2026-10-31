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
 * is recorded without changing its callers. The history lives in memory for the day.
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
   * Records a toast as a notice. A toast shown while the window was in front counts as read.
   *
   * @param notification - The message the toast shows.
   * @public
   */
  public push(notification: INotificationMessage): void {
    const now = Date.now();
    const notice: INotificationNotice = {
      id: `notice-${++this._sequence}`,
      kind: notification.kind,
      title: notification.title,
      content: notification.content,
      occurredAt: now,
      read: this.isWindowInFront(),
    };
    this._notices.update((notices) =>
      [notice, ...notices.filter((entry) => entry.occurredAt >= startOfDay(now))].slice(
        0,
        MAXIMUM_NOTICES,
      ),
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
