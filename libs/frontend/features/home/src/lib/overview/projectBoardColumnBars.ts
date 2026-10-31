// #region Imports

import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';
import { resolveBoardColumnLayout } from '@symphony/frontend-core';
import type { IBoardColumnBar } from './IBoardColumnBar';

// #endregion

/**
 * Counts the work items per visible board column, in board order and with the Board's own
 * column layout, so every bar matches the column the Board shows.
 *
 * @param columns - Provider board columns.
 * @param activeBoardId - The board selected in the active scope, if any.
 * @param items - Work items of the active scope.
 * @returns One bar per column.
 * @public
 */
export function projectBoardColumnBars(
  columns: readonly IBoardColumn[],
  activeBoardId: string | undefined,
  items: readonly IWorkItem[],
): readonly IBoardColumnBar[] {
  const layout = resolveBoardColumnLayout(columns, activeBoardId, items);
  const counts = new Map<string, number>();
  for (const item of items) {
    const columnId = layout.columnIdFor(item);
    counts.set(columnId, (counts.get(columnId) ?? 0) + 1);
  }
  const fullest = Math.max(0, ...counts.values());
  return layout.columns.map((column) => {
    const count = counts.get(column.id) ?? 0;
    return {
      id: column.id,
      label: column.label,
      count,
      share: fullest ? Math.round((count / fullest) * 1000) / 10 : 0,
    };
  });
}
