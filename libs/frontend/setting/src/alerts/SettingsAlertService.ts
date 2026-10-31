// #region Imports

import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Inject, inject, Injectable } from '@angular/core';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import { showSettingsSheet } from '../sheets/showSettingsSheet';
import type { ISettingsAlert } from './ISettingsAlert';

// #endregion

/** Width of an alert sheet, narrower than an editor sheet, as drawn in `Settings-Dialogs`. */
const ALERT_SHEET_WIDTH: `${number}px` = '420px';

/**
 * Asks the confirmations of the Settings window as alert sheets: an icon, the question, what
 * happens, and the buttons at the bottom right, with a danger primary button for destructive
 * actions. Escape answers like the secondary button.
 *
 * ```ts
 * if (await alerts.confirm({
 *   id: 'remove-machine',
 *   header: 'Remove this machine?',
 *   message: `${name} and its disk will be deleted.`,
 *   confirmLabel: 'Remove machine',
 *   cancelLabel: 'Keep machine',
 *   destructive: true,
 * })) await store.removeMachine(name);
 * ```
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class SettingsAlertService {
  // #region Fields

  private readonly _dialogs: DialogService;
  private readonly _application: ApplicationRef;
  private readonly _document: Document;

  // #endregion

  // #region Ctor

  /**
   * Connects the window's Mosaik dialog service and render lifecycle.
   *
   * @public
   */
  public constructor(
    @Inject(DialogService) dialogs: DialogService = inject(DialogService),
    @Inject(ApplicationRef) application: ApplicationRef = inject(ApplicationRef),
    @Inject(DOCUMENT) document: Document = inject(DOCUMENT),
  ) {
    this._dialogs = dialogs;
    this._application = application;
    this._document = document;
  }

  // #endregion

  // #region Methods

  /**
   * Shows an alert sheet and resolves whether the primary button was chosen.
   *
   * @param alert - The question, its consequences and its buttons.
   * @returns `true` after the primary button, `false` after the secondary button or Escape.
   * @public
   */
  public async confirm(alert: ISettingsAlert): Promise<boolean> {
    const { SettingsAlertSheetView } = await import('../views/SettingsAlertSheetView');
    const sheet = showSettingsSheet<ISettingsAlert, boolean>(
      this._dialogs,
      SettingsAlertSheetView,
      alert,
      ALERT_SHEET_WIDTH,
    );
    // The sheet's templates register with the dialog after its first render; render again so
    // the question and its buttons appear, as for editor sheets.
    const browserWindow = this._document.defaultView;
    browserWindow?.requestAnimationFrame(() => {
      this._application.tick();
      browserWindow.requestAnimationFrame(() => this._application.tick());
    });
    return new Promise<boolean>((resolve) => {
      const subscription = sheet.closed.subscribe((closed) => {
        subscription.unsubscribe();
        resolve(closed?.reason === 'positive');
      });
    });
  }

  // #endregion
}
