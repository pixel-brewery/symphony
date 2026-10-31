// #region Imports

import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Inject, inject, Injectable } from '@angular/core';
import { DialogService, type IDialogRef } from '@pixel-brewery/mosaik-elements-angular';
import type { WorkspaceSettingsSection } from '../models/WorkspaceSettingsSection';
import { SETTINGS_SHEET_WIDTH } from '../sheets/SettingsSheetWidth';
import { showSettingsSheet } from '../sheets/showSettingsSheet';
import type { ISettingsEditorRequest } from './ISettingsEditorRequest';
import type { ISettingsEditorResult } from './ISettingsEditorResult';
import { SettingsEditorRegistry } from './SettingsEditorRegistry';

// #endregion

/**
 * Presents feature-owned editors as sheets of the Settings window, keeps one sheet open at a time
 * and opens a follow-up editor when a sheet closes with one.
 *
 * Editors render `mosaikDialogHeader`, `mosaikDialogContent` and `mosaikDialogFooter` templates and
 * read their request through `DIALOG_REF_DATA` and their sheet through `DIALOG_REF`.
 *
 * @public
 */
@Injectable()
export class SettingsEditorService {
  // #region Fields

  private readonly _registry: SettingsEditorRegistry;
  private readonly _dialogs: DialogService;
  private readonly _application: ApplicationRef;
  private readonly _window: Window;
  private _active?: IDialogRef<ISettingsEditorRequest, ISettingsEditorResult>;
  private _opening = false;

  // #endregion

  // #region Ctor

  /**
   * Connects the native dialog service and application render lifecycle.
   *
   * @public
   */
  public constructor(
    @Inject(SettingsEditorRegistry)
    registry: SettingsEditorRegistry = inject(SettingsEditorRegistry),
    @Inject(DialogService) dialogs: DialogService = inject(DialogService),
    @Inject(ApplicationRef) application: ApplicationRef = inject(ApplicationRef),
    @Inject(DOCUMENT) document: Document = inject(DOCUMENT),
  ) {
    this._registry = registry;
    this._dialogs = dialogs;
    this._application = application;
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Settings editors require a browser window.');
    this._window = browserWindow;
  }

  // #endregion

  // #region Methods

  /**
   * Opens a validated feature editor as a sheet or draws attention to the sheet already open.
   *
   * @param request - The owning feature's explicit editor request.
   * @param onSection - Optional host navigation applied before this editor or a follow-up opens.
   * @public
   */
  public async open(
    request: ISettingsEditorRequest,
    onSection?: (workspaceId: string | undefined, section: WorkspaceSettingsSection) => void,
  ): Promise<void> {
    if (this._active && this._dialogs.isShown(this._active)) {
      void this._active.requestAttention();
      return;
    }
    if (this._opening) return;
    const editor = this._registry.resolve(request);
    this._opening = true;
    try {
      const component = await editor.loadComponent();
      if (editor.workspaceSection) onSection?.(request.workspaceId, editor.workspaceSection);
      const sheet = showSettingsSheet<ISettingsEditorRequest, ISettingsEditorResult>(
        this._dialogs,
        component,
        request,
        editor.width ?? SETTINGS_SHEET_WIDTH,
      );
      this._active = sheet;
      this._window.requestAnimationFrame(() => {
        this._application.tick();
        this._window.requestAnimationFrame(() => this._application.tick());
      });
      sheet.closed.subscribe((closed) => {
        if (this._active === sheet) this._active = undefined;
        const next = closed?.result?.next;
        if (next) void this.open(next, onSection);
      });
    } finally {
      this._opening = false;
    }
  }

  // #endregion
}
