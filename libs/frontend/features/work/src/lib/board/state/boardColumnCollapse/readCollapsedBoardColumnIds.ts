// #region Imports

import { COLLAPSED_BOARD_COLUMNS_STORAGE_KEY } from './CollapsedBoardColumnsStorageKey';

// #endregion

/**
 * Reads the collapsed columns. Ids of columns that are not in scope right now are kept rather
 * than pruned: switching the board or the workspace selection must not silently expand columns
 * the operator collapsed, and a stale id simply never matches a rendered column.
 */
export function readCollapsedBoardColumnIds(
  storage: Pick<Storage, 'getItem'>,
): ReadonlySet<string> {
  const stored = storage.getItem(COLLAPSED_BOARD_COLUMNS_STORAGE_KEY);
  if (!stored) return new Set();
  try {
    const parsed: unknown = JSON.parse(stored);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [],
    );
  } catch {
    return new Set();
  }
}
