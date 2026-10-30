// #region Imports

import type { IWorkFilters } from '@symphony/frontend-core/work';
import { Injectable, signal } from '@angular/core';

// #endregion

/** Owns the same Work filters used by Board and Home's work projection. @public */
@Injectable()
export class WorkFilterStore implements IWorkFilters {
  // #region Fields

  /** Shared work query retained across view navigation. @public @readonly */
  public readonly query = signal('');
  /** Selected work label. @public @readonly */
  public readonly label = signal<string | undefined>(undefined);
  /** Selected provider board column. @public @readonly */
  public readonly columnId = signal<string | undefined>(undefined);
  /** Selected workflow stage. @public @readonly */
  public readonly stageId = signal<string | undefined>(undefined);

  // #endregion
  // #region Methods
  /** Applies the existing shared query through its actual owner. @public */
  public setQuery(value: string): void {
    this.query.set(value);
  }
  /** Applies the existing shared label filter through its actual owner. @public */
  public setLabel(value: string | undefined): void {
    this.label.set(value);
  }
  /** Applies the existing provider-column filter through its actual owner. @public */
  public setColumnId(value: string | undefined): void {
    this.columnId.set(value);
  }
  /** Applies the existing workflow-stage filter through its actual owner. @public */
  public setStageId(value: string | undefined): void {
    this.stageId.set(value);
  }
  // #endregion
}
