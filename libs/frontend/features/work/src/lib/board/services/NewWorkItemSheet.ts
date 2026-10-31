// #region Imports

import { inject, Injectable } from '@angular/core';
import { DialogService, type IDialogRef } from '@pixel-brewery/mosaik-elements-angular';
import type { IWorkItem } from '@symphony/domain-work';
import { NewWorkItemSheetView } from '../views/dialogs/NewWorkItemSheetView';
import type { INewWorkItemSheetOptions } from './INewWorkItemSheetOptions';

// #endregion

const SHEET_MAX_HEIGHT = '86dvh';

/**
 * Opens the `New work item` sheet, the single entry point for creating a work item.
 *
 * The board's `New work item`, the `?create=true` intent (⌘N, the application menu, the command
 * palette and the Overview quick action navigate there) and every other caller end here, so
 * only one sheet is ever open: a second request draws attention to it instead.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class NewWorkItemSheet {
  // #region Fields

  private readonly _dialogs = inject(DialogService);
  private _ref?: IDialogRef<INewWorkItemSheetOptions, IWorkItem>;

  // #endregion

  // #region Methods

  /**
   * Opens the sheet, or draws attention to the one already open.
   *
   * @param options - Where the new item starts, when the caller knows it (a column's `+`).
   * @returns The open sheet.
   * @public
   */
  public open(
    options: INewWorkItemSheetOptions = {},
  ): IDialogRef<INewWorkItemSheetOptions, IWorkItem> {
    // The reference lives until the sheet reports itself closed.
    if (this._ref) {
      void this._ref.requestAttention();
      return this._ref;
    }
    const ref = this._dialogs.show<INewWorkItemSheetOptions, IWorkItem>(NewWorkItemSheetView, {
      data: options,
      hasBackdrop: true,
      backdropStrategy: 'own',
      // Typed text is not thrown away by a stray click beside the sheet; Escape and Cancel close.
      clickOutsideToClose: false,
      pressEscapeToClose: true,
      size: { width: '600px' },
      minSize: { width: '20rem' },
      maxSize: { width: '100vw', height: SHEET_MAX_HEIGHT },
    });
    // `maxSize` caps only the overlay pane; the dialog surface follows its own public
    // `--dialog-max-height`. Without it a tall sheet (an AI draft with every field) outgrows the
    // window, and its header and `Create work item` footer leave the screen.
    ref.element.style.setProperty('--dialog-max-height', SHEET_MAX_HEIGHT);
    this._ref = ref;
    ref.closed.subscribe(() => {
      if (this._ref === ref) this._ref = undefined;
    });
    return ref;
  }

  // #endregion
}
