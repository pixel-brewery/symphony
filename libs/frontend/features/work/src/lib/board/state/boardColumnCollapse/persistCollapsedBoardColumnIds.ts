// #region Imports

import { COLLAPSED_BOARD_COLUMNS_STORAGE_KEY } from './CollapsedBoardColumnsStorageKey';

// #endregion

export function persistCollapsedBoardColumnIds(
  columnIds: Iterable<string>,
  storage: Pick<Storage, 'setItem'>,
): void {
  storage.setItem(COLLAPSED_BOARD_COLUMNS_STORAGE_KEY, JSON.stringify([...columnIds]));
}
