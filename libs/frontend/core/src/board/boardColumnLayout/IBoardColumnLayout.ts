// #region Imports

import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';

// #endregion

export interface IBoardColumnLayout {
  readonly columns: readonly IBoardColumn[];
  columnIdFor(item: IWorkItem): string;
  /**
   * Provider column one item would be written to for a visible column. While several boards are
   * merged, a visible column stands for one column per board, and only the column of the item's
   * own board is a value its provider accepts.
   */
  providerColumnFor(item: IWorkItem, columnId: string): IBoardColumn | undefined;
}
