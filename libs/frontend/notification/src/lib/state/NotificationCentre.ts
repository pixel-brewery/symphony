// #region Imports

import { computed, Inject, inject, Injectable, Optional, signal } from '@angular/core';
import type { INotificationItem } from '../models/INotificationItem';
import type { NotificationSeverity } from '../models/NotificationSeverity';
import { NOTIFICATION_SOURCES } from '../provider/NotificationSources';
import type { INotificationSource } from '../sources/INotificationSource';
import { NotificationHistory } from './NotificationHistory';

// #endregion

const SEVERITY_ORDER: readonly NotificationSeverity[] = ['error', 'warning', 'info'];
const REFRESH_INTERVAL_MILLISECONDS = 10_000;

/**
 * The notification centre's state for one window: what needs attention, gathered from the
 * feature sources, and today's notices, with their read state.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class NotificationCentre {
  // #region Fields

  private readonly _sources: readonly INotificationSource[];
  private readonly _history: NotificationHistory;
  private readonly _readItemIds = signal<ReadonlySet<string>>(new Set());
  private readonly _isOpen = signal(false);
  private _connected = false;
  private _refreshInFlight?: Promise<void>;
  private _refreshedAt = Number.NEGATIVE_INFINITY;

  /**
   * Problems from every source, most severe first; within a severity in source order.
   *
   * @public
   * @readonly
   */
  public readonly items = computed<readonly INotificationItem[]>(() =>
    this._sources
      .flatMap((source) => source.items())
      .map((item, index) => ({ item, index }))
      .sort(
        (left, right) =>
          SEVERITY_ORDER.indexOf(left.item.severity) -
            SEVERITY_ORDER.indexOf(right.item.severity) || left.index - right.index,
      )
      .map(({ item }) => item),
  );

  /**
   * Number of problems that need attention, shown on the bell and in the tray.
   *
   * @public
   * @readonly
   */
  public readonly attentionCount = computed(() => this.items().length);

  /**
   * Whether the centre is open in this window.
   *
   * @public
   * @readonly
   */
  public readonly isOpen = this._isOpen.asReadonly();

  /**
   * Identifiers of problems the user marked as read.
   *
   * @public
   * @readonly
   */
  public readonly readItemIds = this._readItemIds.asReadonly();

  /**
   * Today's notices, newest first.
   *
   * @public
   * @readonly
   */
  public readonly notices: NotificationHistory['notices'];

  /**
   * Number of unread problems and notices.
   *
   * @public
   * @readonly
   */
  public readonly unreadCount = computed(
    () =>
      this.items().filter((item) => !this._readItemIds().has(item.id)).length +
      this._history.unreadCount(),
  );

  /**
   * Number of notices `Clear read` would remove.
   *
   * @public
   * @readonly
   */
  public readonly readNoticeCount: NotificationHistory['readCount'];

  // #endregion

  // #region Ctor

  /**
   * Gathers the included features' sources and this window's notice history.
   *
   * @param sources - Sources contributed with `withNotificationSources`.
   * @param history - This window's notice history.
   * @public
   */
  public constructor(
    @Optional()
    @Inject(NOTIFICATION_SOURCES)
    sources: readonly INotificationSource[] | null = inject(NOTIFICATION_SOURCES, {
      optional: true,
    }),
    @Inject(NotificationHistory) history: NotificationHistory = inject(NotificationHistory),
  ) {
    this._sources = sources ?? [];
    this._history = history;
    this.notices = history.notices;
    this.readNoticeCount = history.readCount;
  }

  // #endregion

  // #region Methods

  /**
   * Starts the sources' own updates once for this window.
   *
   * @public
   */
  public connect(): void {
    if (this._connected) return;
    this._connected = true;
    for (const source of this._sources) source.connect?.();
  }

  /**
   * Loads every source's state again. A source that fails keeps its last items. Requests within
   * ten seconds of the last load share it.
   *
   * @public
   */
  public refresh(): Promise<void> {
    if (this._refreshInFlight) return this._refreshInFlight;
    if (Date.now() - this._refreshedAt < REFRESH_INTERVAL_MILLISECONDS) return Promise.resolve();
    this._refreshInFlight = Promise.allSettled(
      this._sources.map((source) => source.refresh?.()),
    ).then(() => {
      this._refreshedAt = Date.now();
      this._refreshInFlight = undefined;
    });
    return this._refreshInFlight;
  }

  /**
   * Drops notices from before today and forgets read marks of problems that are gone, so a
   * problem that comes back is new again.
   *
   * @public
   */
  public prune(): void {
    this._history.prune(Date.now());
    const current = new Set(this.items().map((item) => item.id));
    const read = this._readItemIds();
    if ([...read].every((id) => current.has(id))) return;
    this._readItemIds.set(new Set([...read].filter((id) => current.has(id))));
  }

  /**
   * Opens the centre: drops notices from before today and loads the sources again.
   *
   * @public
   */
  public open(): void {
    this.prune();
    this._isOpen.set(true);
    void this.refresh();
  }

  /**
   * Closes the centre.
   *
   * @public
   */
  public close(): void {
    this._isOpen.set(false);
  }

  /**
   * Opens a closed centre and closes an open one.
   *
   * @public
   */
  public toggle(): void {
    if (this._isOpen()) this.close();
    else this.open();
  }

  /**
   * Marks every problem and notice as read.
   *
   * @public
   */
  public markAllAsRead(): void {
    this._readItemIds.set(new Set(this.items().map((item) => item.id)));
    this._history.markAllAsRead();
  }

  /**
   * Removes the read notices from today's history. Problems stay until they are resolved.
   *
   * @public
   */
  public clearRead(): void {
    this._history.clearRead();
  }

  /**
   * Performs a fix through the source that contributed the item and marks the item as read. The
   * centre closes, because a fix opens Settings or asks for confirmation.
   *
   * @param itemId - Identifier of the item.
   * @param actionId - Identifier of one of the item's actions.
   * @public
   */
  public async perform(itemId: string, actionId: string): Promise<void> {
    const source = this._sources.find((candidate) =>
      candidate.items().some((item) => item.id === itemId),
    );
    if (!source) return;
    this._isOpen.set(false);
    this._readItemIds.update((read) => new Set([...read, itemId]));
    await source.perform(itemId, actionId);
  }

  // #endregion
}
