// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';

// #endregion

/**
 * Owns Work item projections and immutable item updates over the single transport snapshot.
 *
 * @public
 */
@Injectable()
export class WorkSnapshotContext {
  // #region Fields

  private readonly _snapshot: ApplicationSnapshot;
  private readonly _synchronizer: OrchestrationSynchronizer;
  private readonly _items: Signal<readonly IWorkItem[]>;
  private readonly _boardColumns: Signal<readonly IBoardColumn[]>;

  // #endregion

  // #region Ctor

  /** Connects the existing aggregate and refresh dependencies. @public */
  public constructor(
    @Inject(ApplicationSnapshot) snapshot: ApplicationSnapshot = inject(ApplicationSnapshot),
    @Inject(OrchestrationSynchronizer)
    synchronizer: OrchestrationSynchronizer = inject(OrchestrationSynchronizer),
  ) {
    this._snapshot = snapshot;
    this._synchronizer = synchronizer;
    this._items = computed(() => snapshot.snapshot()?.workItems ?? []);
    this._boardColumns = computed(() => snapshot.snapshot()?.boardColumns ?? []);
  }

  // #endregion

  // #region Properties

  /** Work items from the authoritative snapshot. @public @readonly */
  public get items(): Signal<readonly IWorkItem[]> {
    return this._items;
  }
  /** Board columns from the authoritative snapshot. @public @readonly */
  public get boardColumns(): Signal<readonly IBoardColumn[]> {
    return this._boardColumns;
  }

  // #endregion

  // #region Methods

  /** Applies a known item's result without changing card order. @public */
  public replaceItem(item: IWorkItem): void {
    this._snapshot.update((snapshot) =>
      snapshot
        ? {
            ...snapshot,
            workItems: snapshot.workItems.map((candidate) =>
              candidate.id === item.id ? item : candidate,
            ),
          }
        : snapshot,
    );
  }

  /** Preserves a saved card's position or appends a newly created card. @public */
  public upsertItem(item: IWorkItem): void {
    this._snapshot.update((snapshot) =>
      snapshot
        ? {
            ...snapshot,
            workItems: snapshot.workItems.some((candidate) => candidate.id === item.id)
              ? snapshot.workItems.map((candidate) => (candidate.id === item.id ? item : candidate))
              : [...snapshot.workItems, item],
          }
        : snapshot,
    );
  }

  /** Reconciles the current aggregate through its existing owner. @public */
  public refresh(): Promise<void> {
    return this._synchronizer.refresh();
  }
  /** Retains the existing post-mutation replay of a refresh already in progress. @public */
  public repeatAfterActiveRefresh(): () => void {
    return this._synchronizer.repeatAfterActiveRefresh();
  }

  // #endregion
}
