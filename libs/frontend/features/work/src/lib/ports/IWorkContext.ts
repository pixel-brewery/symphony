// #region Imports

import type { Signal } from '@angular/core';
import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * Supplies only the aggregate projections consumed by Work mutations and selection.
 *
 * @public
 */
export interface IWorkContext {
  /** Current authoritative work items. @public @readonly */
  readonly items: Signal<readonly IWorkItem[]>;
  /** Current provider board columns. @public @readonly */
  readonly boardColumns: Signal<readonly IBoardColumn[]>;
}
