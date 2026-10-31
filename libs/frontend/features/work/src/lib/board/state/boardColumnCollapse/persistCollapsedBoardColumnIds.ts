// #region Imports

import { COLLAPSED_BOARD_COLUMNS_STORAGE_KEY } from './CollapsedBoardColumnsStorageKey';

// #endregion

/**
 * Persists a set of board column ids under the collapsed-columns preference, or under another
 * board-column preference such as the explicitly expanded columns.
 */
export function persistCollapsedBoardColumnIds(
  columnIds: Iterable<string>,
  storage: Pick<Storage, 'setItem'>,
  key: string = COLLAPSED_BOARD_COLUMNS_STORAGE_KEY,
): void {
  storage.setItem(key, JSON.stringify([...columnIds]));
}
