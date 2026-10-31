// #region Imports

import { Inject, inject, Injectable, signal } from '@angular/core';
import {
  EXPANDED_BOARD_COLUMNS_STORAGE_KEY,
  persistCollapsedBoardColumnIds,
  readCollapsedBoardColumnIds,
} from './boardColumnCollapse';
import { BROWSER_STORAGE } from '@symphony/frontend-core/work';

// #endregion

/**
 * Collapsed state of the board columns. Like the navigation and rail state this is renderer-local
 * view state of one operator on one machine, so it belongs in browser storage rather than in the
 * orchestrator settings that describe the workspace itself.
 *
 * A column follows its default until the operator toggles it: the board collapses the columns
 * before and after active delivery (`Backlog`, `Qualified`, `Done`) and expands the others, and an
 * explicit collapse or expansion is remembered in either direction.
 */
@Injectable({ providedIn: 'root' })
export class BoardColumnCollapseStore {
  // #region Fields

  private readonly _storage: Storage | undefined;

  private readonly _collapsedColumnIds = signal<ReadonlySet<string>>(new Set());

  private readonly _expandedColumnIds = signal<ReadonlySet<string>>(new Set());

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
    if (storage) {
      this._collapsedColumnIds.set(readCollapsedBoardColumnIds(storage));
      this._expandedColumnIds.set(
        readCollapsedBoardColumnIds(storage, EXPANDED_BOARD_COLUMNS_STORAGE_KEY),
      );
    }
  }

  // #endregion

  // #region Methods

  /**
   * Whether the column is expanded: the operator's explicit choice, otherwise its default, so an
   * unknown column stays open.
   *
   * @param columnId - Column id.
   * @param expandedByDefault - Whether the board shows the column expanded until it is toggled.
   * @public
   */
  public isExpanded(columnId: string, expandedByDefault = true): boolean {
    if (this._collapsedColumnIds().has(columnId)) return false;
    if (this._expandedColumnIds().has(columnId)) return true;
    return expandedByDefault;
  }

  /**
   * Records the operator's choice for one column.
   *
   * @param columnId - Column id.
   * @param isExpanded - Is expanded.
   * @public
   */
  public setExpanded(columnId: string, isExpanded: boolean): void {
    const collapsed = new Set(this._collapsedColumnIds());
    const expanded = new Set(this._expandedColumnIds());
    if (isExpanded ? expanded.has(columnId) : collapsed.has(columnId)) return;
    if (isExpanded) {
      collapsed.delete(columnId);
      expanded.add(columnId);
    } else {
      expanded.delete(columnId);
      collapsed.add(columnId);
    }
    this._collapsedColumnIds.set(collapsed);
    this._expandedColumnIds.set(expanded);
    if (this._storage) {
      persistCollapsedBoardColumnIds(collapsed, this._storage);
      persistCollapsedBoardColumnIds(expanded, this._storage, EXPANDED_BOARD_COLUMNS_STORAGE_KEY);
    }
  }

  // #endregion
}
