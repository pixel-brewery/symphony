// #region Imports

import type { Type } from '@angular/core';
import type { DialogService, IDialogRef } from '@pixel-brewery/mosaik-elements-angular';

// #endregion

/**
 * Presents a component as a sheet of the Settings window: a modal Mosaik dialog of the given
 * width that closes with Escape and never by a click outside. The dialog host is marked with
 * `part="settings-sheet"` so the window stylesheet can give every sheet the same density.
 *
 * Mosaik's dialog centres its surface in the window and offers no public input to attach it to
 * the top edge, so the sheet stays centred. It does not move focus on open: Mosaik would focus a
 * text box before the box has rendered its input.
 *
 * @param dialogs - The window's Mosaik dialog service.
 * @param component - Standalone component rendering `mosaikDialogHeader/Content/Footer`.
 * @param data - Data the component reads through `DIALOG_REF_DATA`.
 * @param width - Sheet width as a CSS length.
 * @returns The dialog reference.
 * @public
 */
export function showSettingsSheet<TData, TResult>(
  dialogs: DialogService,
  component: Type<unknown>,
  data: TData,
  width: `${number}px`,
): IDialogRef<TData, TResult> {
  const sheet = dialogs.show<TData, TResult>(component, {
    data,
    hasBackdrop: true,
    backdropStrategy: 'own',
    clickOutsideToClose: false,
    pressEscapeToClose: true,
    focusOnOpen: false,
    size: { width },
    maxSize: { width: '96vw', height: '88dvh' },
  });
  sheet.element.setAttribute('part', 'settings-sheet');
  return sheet;
}
