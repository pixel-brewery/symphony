// #region Imports

import { inject, Injectable, signal } from '@angular/core';
import { Cancel, DIALOG_REF, type IDialogRef } from '@pixel-brewery/mosaik-elements-angular';
import { ViewPresenter } from '@symphony/frontend-core';
import type { DeliveryGroupAssessmentMode } from './DeliveryGroupAssessmentMode';

// #endregion

@Injectable()
export class DeliveryGroupModeDialogViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _dialogRef = inject(DIALOG_REF) as IDialogRef<
    undefined,
    DeliveryGroupAssessmentMode
  >;

  // #endregion

  // #region Properties

  /**
   * Selected grouping path. Direct grouping is the fast, explicit default.
   *
   * @public
   * @readonly
   */
  public readonly mode = signal<DeliveryGroupAssessmentMode>('direct');

  // #endregion

  // #region Methods

  /**
   * Applies the value a Mosaik radio group reports on `radioChanged`.
   *
   * @public
   * @readonly
   */
  public readonly changeMode = (event: unknown): void => {
    const value = (event as { readonly value?: unknown } | null)?.value;
    if (value === 'analyzer' || value === 'direct') this.mode.set(value);
  };

  /**
   * Returns the selected path to the board.
   *
   * @public
   * @readonly
   */
  public readonly continue = (): void => {
    this._dialogRef.close(Cancel.positive(this.mode()));
  };

  /**
   * Leaves the selection unchanged and cancels grouping.
   *
   * @public
   * @readonly
   */
  public readonly cancel = (): void => {
    this._dialogRef.close(Cancel.negative());
  };

  // #endregion
}
