// #region Imports

import { Directive, effect, Inject, inject, Input, Self, signal, type Signal } from '@angular/core';
import { ViewSlotOutletComponent } from '@pixel-brewery/mosaik-elements-angular';
import type { ISettingsWorkspaceContext } from './ISettingsWorkspaceContext';
import type { ISettingsWorkspaceSelection } from './ISettingsWorkspaceSelection';
import { SETTINGS_WORKSPACE_CONTEXT } from './SettingsWorkspaceContextToken';

// #endregion

/**
 * Connects a Settings workspace selection to the native Mosaik slot and its contributed views.
 *
 * @public
 */
@Directive({
  selector: 'mosaik-view-slot-outlet[symphonySettingsWorkspace]',
  providers: [
    {
      provide: SETTINGS_WORKSPACE_CONTEXT,
      useFactory: (): ISettingsWorkspaceContext => inject(SettingsWorkspaceContextDirective),
    },
  ],
})
export class SettingsWorkspaceContextDirective implements ISettingsWorkspaceContext {
  // #region Fields

  private readonly _workspaceId = signal<string | null>(null);
  private readonly _sectionId = signal<string | null>(null);
  private readonly _publicWorkspaceId = this._workspaceId.asReadonly();
  private readonly _publicSectionId = this._sectionId.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Connects the selection to the real outlet while retaining its stable child injectors.
   *
   * @param outlet - Mosaik outlet on the same host element.
   * @public
   */
  public constructor(
    @Inject(ViewSlotOutletComponent)
    @Self()
    outlet: ViewSlotOutletComponent = inject(ViewSlotOutletComponent, { self: true }),
  ) {
    effect(() => {
      const workspaceId = this.workspaceId();
      const sectionId = this.sectionId();
      const selection: ISettingsWorkspaceSelection | null =
        workspaceId && sectionId ? { workspaceId, sectionId } : null;
      outlet.setSelection(selection);
    });
  }

  // #endregion

  // #region Properties

  /**
   * Selected Settings workspace, separate from the active application scope.
   *
   * @public
   * @readonly
   */
  public get workspaceId(): Signal<string | null> {
    return this._publicWorkspaceId;
  }
  /**
   * Selected independently registered Settings section.
   *
   * @public
   * @readonly
   */
  public get sectionId(): Signal<string | null> {
    return this._publicSectionId;
  }

  /**
   * Receives the host's workspace binding through Angular's public input metadata.
   *
   * @public
   */
  @Input('symphonySettingsWorkspace')
  public set selectedWorkspaceId(workspaceId: string | null) {
    this._workspaceId.set(workspaceId);
  }
  /**
   * Receives the host's section binding through Angular's public input metadata.
   *
   * @public
   */
  @Input()
  public set symphonySettingsSection(sectionId: string | null) {
    this._sectionId.set(sectionId);
  }

  // #endregion
}
