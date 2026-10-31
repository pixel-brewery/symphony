// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/** Only the existing Work filter projections and edits consumed across feature boundaries. @public */
export interface IWorkFilters {
  readonly query: Signal<string>;
  readonly label: Signal<string | undefined>;
  readonly columnId: Signal<string | undefined>;
  readonly stageId: Signal<string | undefined>;
  setQuery(value: string): void;
  setLabel(value: string | undefined): void;
  setColumnId(value: string | undefined): void;
  setStageId(value: string | undefined): void;
}
