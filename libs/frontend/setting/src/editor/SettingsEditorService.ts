// #region Imports

import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Inject, inject, Injectable } from '@angular/core';
import { DrawerService, type IDrawerRef } from '@pixel-brewery/mosaik-elements-angular';
import type { WorkspaceSettingsSection } from '../models/WorkspaceSettingsSection';
import type { ISettingsEditorRequest } from './ISettingsEditorRequest';
import type { ISettingsEditorResult } from './ISettingsEditorResult';
import { SettingsEditorRegistry } from './SettingsEditorRegistry';

// #endregion

/**
 * Preserves one active Settings drawer and follow-up sequencing for feature-owned editors.
 *
 * @public
 */
@Injectable()
export class SettingsEditorService {
  // #region Fields

  private readonly _registry: SettingsEditorRegistry;
  private readonly _drawers: DrawerService;
  private readonly _application: ApplicationRef;
  private readonly _window: Window;
  private _active?: IDrawerRef<ISettingsEditorRequest, ISettingsEditorResult>;
  private _opening = false;

  // #endregion

  // #region Ctor

  /**
   * Connects the native drawer and application render lifecycle.
   *
   * @public
   */
  public constructor(
    @Inject(SettingsEditorRegistry)
    registry: SettingsEditorRegistry = inject(SettingsEditorRegistry),
    @Inject(DrawerService) drawers: DrawerService = inject(DrawerService),
    @Inject(ApplicationRef) application: ApplicationRef = inject(ApplicationRef),
    @Inject(DOCUMENT) document: Document = inject(DOCUMENT),
  ) {
    this._registry = registry;
    this._drawers = drawers;
    this._application = application;
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Settings editors require a browser window.');
    this._window = browserWindow;
  }

  // #endregion

  // #region Methods

  /**
   * Opens a validated feature editor or draws attention to the existing active drawer.
   *
   * @param request - The owning feature's explicit editor request.
   * @param onSection - Optional host navigation applied before this editor or a follow-up opens.
   * @public
   */
  public async open(
    request: ISettingsEditorRequest,
    onSection?: (workspaceId: string | undefined, section: WorkspaceSettingsSection) => void,
  ): Promise<void> {
    if (this._active && this._drawers.isShown(this._active)) {
      this._active.requestAttention();
      return;
    }
    if (this._opening) return;
    const editor = this._registry.resolve(request);
    this._opening = true;
    try {
      const component = await editor.loadComponent();
      if (editor.workspaceSection) onSection?.(request.workspaceId, editor.workspaceSection);
      const drawer = this._drawers.show<ISettingsEditorRequest, ISettingsEditorResult>(component, {
        data: request,
      });
      this._active = drawer;
      this._window.requestAnimationFrame(() => {
        this._application.tick();
        this._window.requestAnimationFrame(() => this._application.tick());
      });
      drawer.closed.subscribe((closed) => {
        if (this._active === drawer) this._active = undefined;
        const next = closed?.result?.next;
        if (next) void this.open(next, onSection);
      });
    } finally {
      this._opening = false;
    }
  }

  // #endregion
}
