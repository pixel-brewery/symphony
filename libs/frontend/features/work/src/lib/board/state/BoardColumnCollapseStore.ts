// #region Imports

import { Inject, inject, Injectable, signal } from '@angular/core';
import { persistCollapsedBoardColumnIds, readCollapsedBoardColumnIds } from './boardColumnCollapse';
import { BROWSER_STORAGE } from '@symphony/frontend-core/work';

// #endregion

/**
 * Collapsed state of the board columns. Like the navigation and rail state this is renderer-local
 * view state of one operator on one machine, so it belongs in browser storage rather than in the
 * orchestrator settings that describe the workspace itself.
 */
@Injectable({ providedIn: 'root' })
export class BoardColumnCollapseStore {
  // #region Fields

  private readonly _storage: Storage | undefined;

  private readonly _collapsedColumnIds = signal<ReadonlySet<string>>(new Set());

  // #endregion

  // #region Ctor

  /**
   * Constructs the board-column preference store.
   *
   * @public
   */
  public constructor(
    @Inject(BROWSER_STORAGE) storage: Storage | undefined = inject(BROWSER_STORAGE),
  ) {
    this._storage = storage;
    if (storage) this._collapsedColumnIds.set(readCollapsedBoardColumnIds(storage));
  }

  // #endregion

  // #region Methods

  /**
   * Columns are expanded unless the operator collapsed them, so an unknown column stays open.
   *
   * @param columnId - Column id.
   * @public
   */
  public isExpanded(columnId: string): boolean {
    return !this._collapsedColumnIds().has(columnId);
  }

  /**
   * Sets the expanded.
   *
   * @param columnId - Column id.
   * @param isExpanded - Is expanded.
   * @public
   */
  public setExpanded(columnId: string, isExpanded: boolean): void {
    const collapsed = new Set(this._collapsedColumnIds());
    if (isExpanded ? !collapsed.delete(columnId) : collapsed.has(columnId)) return;
    if (!isExpanded) collapsed.add(columnId);
    this._collapsedColumnIds.set(collapsed);
    if (this._storage) persistCollapsedBoardColumnIds(collapsed, this._storage);
  }

  // #endregion
}
