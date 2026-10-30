// #region Imports

import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';
import type { IBoardColumnLayout } from './IBoardColumnLayout';
import { UNASSIGNED_BOARD_COLUMN_ID } from './UnassignedBoardColumnId';

// #endregion

/**
 * Chooses the visible columns for one board or for every board in scope and maps
 * each work item to its visible column by its provider column id. Columns come only
 * from the provider; the single synthesized bucket is "No column", appended only
 * while items without a provider column exist.
 */
export function resolveBoardColumnLayout(
  providerColumns: readonly IBoardColumn[],
  selectedSourceId: string | undefined,
  items: readonly IWorkItem[] = [],
): IBoardColumnLayout {
  const source = selectedSourceId
    ? providerColumns.filter((column) => column.sourceId === selectedSourceId)
    : providerColumns;
  const merge = !selectedSourceId;
  const columns: IBoardColumn[] = [];
  const aliases = new Map<string, string>();
  const members = new Map<string, IBoardColumn[]>();
  for (const column of source) {
    const existing = merge
      ? columns.find(
          (candidate) =>
            mergeKeyOf(candidate) === mergeKeyOf(column) &&
            !(members.get(candidate.id) ?? []).some(
              (member) => member.sourceId === column.sourceId,
            ),
        )
      : undefined;
    if (existing) {
      aliases.set(column.id, existing.id);
      members.get(existing.id)?.push(column);
      continue;
    }
    columns.push(
      merge
        ? {
            id: column.id,
            label: column.label,
            ...(column.stageId ? { stageId: column.stageId } : {}),
          }
        : column,
    );
    aliases.set(column.id, column.id);
    members.set(column.id, [column]);
  }
  const columnIdFor = (item: IWorkItem): string =>
    (item.boardColumnId ? aliases.get(item.boardColumnId) : undefined) ??
    UNASSIGNED_BOARD_COLUMN_ID;
  if (items.some((item) => columnIdFor(item) === UNASSIGNED_BOARD_COLUMN_ID)) {
    columns.push({ id: UNASSIGNED_BOARD_COLUMN_ID, label: 'No column' });
  }
  const providerColumnFor = (item: IWorkItem, columnId: string): IBoardColumn | undefined => {
    const candidates = members.get(columnId) ?? [];
    const owned = candidates.find((candidate) => candidate.sourceId === item.sourceId);
    if (owned) return owned;
    // Trackers that report one unattributed set of columns (the simulated one) leave the board
    // undivided; where columns do name their board, a column of another board is not a target.
    return candidates.every((candidate) => !candidate.sourceId) ? candidates[0] : undefined;
  };
  return { columns, columnIdFor, providerColumnFor };

  function mergeKeyOf(column: IBoardColumn): string {
    return column.stageId ?? `label:${column.label.trim().toLocaleLowerCase()}`;
  }
}
