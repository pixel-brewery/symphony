// #region Imports

import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Inject, inject, Injectable } from '@angular/core';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { firstValueFrom } from 'rxjs';
import type { IWorkspaceAvatarSelection } from './IWorkspaceAvatarSelection';

// #endregion

/**
 * Opens the reference glyph selection and returns only an explicitly confirmed draft.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceAvatarPicker {
  // #region Fields

  private readonly _dialogs: DialogService;
  private readonly _application: ApplicationRef;
  private readonly _document: Document;

  // #endregion

  // #region Ctor

  /**
   * Connects the window's existing dialog and render lifecycle owners.
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
   * Edits the supplied workspace appearance without persisting settings.
   *
   * @param workspace - Current workspace or unsaved workspace draft.
   * @returns Confirmed appearance, or undefined when dismissed.
   * @public
   */
  public async pick(
    workspace: Pick<ApplicationSettingsDto['workspaces'][number], 'shortCode' | 'color' | 'avatar'>,
  ): Promise<IWorkspaceAvatarSelection | undefined> {
    const { WorkspaceAvatarDialogView } = await import('./WorkspaceAvatarDialogView');
    const reference = this._dialogs.show<typeof workspace, IWorkspaceAvatarSelection>(
      WorkspaceAvatarDialogView,
      {
        id: 'workspace-avatar-dialog',
        data: workspace,
        hasBackdrop: true,
        backdropStrategy: 'own',
        pressEscapeToClose: true,
        clickOutsideToClose: true,
        focusOnOpen: false,
        size: { width: '36rem' },
        maxSize: { width: '100vw', height: '100dvh' },
      },
    );
    const browserWindow = this._document.defaultView;
    browserWindow?.requestAnimationFrame(() => {
      this._application.tick();
      browserWindow.requestAnimationFrame(() => this._application.tick());
    });
    const outcome = await firstValueFrom(reference.closed);
    return outcome.reason === 'positive' ? outcome.result : undefined;
  }

  // #endregion
}
