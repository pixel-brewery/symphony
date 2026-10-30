// #region Imports

import { inject, Injectable, computed } from '@angular/core';
import { ViewPresenter } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import type { MobileBoardColumn } from '@symphony/mobile-contracts';

// #endregion

@Injectable()
export class MobileBoardViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _store = inject(MobileCompanionStore);

  /**
   * The snapshot.
   *
   * @public
   * @readonly
   */
  public readonly snapshot = this._store.snapshot;

  private readonly _initiallyExpanded = computed(
    () => (column: MobileBoardColumn) => this.resolveInitiallyExpanded(column),
  );

  // #endregion

  // #region Properties

  /**
   * The initiallyExpanded projection.
   *
   * @public
   * @readonly
   */
  public get initiallyExpanded() {
    return this._initiallyExpanded;
  }
  // #endregion

  // #region Methods

  /**
   * Returns the initially expanded.
   *
   * @param column - Column.
   * @private
   */
  private resolveInitiallyExpanded(column: MobileBoardColumn): boolean {
    return (
      column.ticketCount > 0 &&
      (column.stageId === 'executing' ||
        column.stageId === 'analyzing' ||
        column.stageId === 'review')
    );
  }

  // #endregion
}
