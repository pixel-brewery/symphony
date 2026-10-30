// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  MenuComponent,
  MenuItemComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  SegmentComponent,
  SegmentItemComponent,
  ViewSlotOutletComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsHostSession } from '../context/SettingsHostSession';
import { SettingsSelectionDirective } from '../context/SettingsSelectionDirective';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { SettingsWorkspaceContextDirective } from '../context/SettingsWorkspaceContextDirective';
import { SettingsViewPresenter } from '../view-presenters/SettingsViewPresenter';

// #endregion

/**
 * Settings route host for independently contributed sections and cards.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-view',
  host: { class: 'block' },
  imports: [
    MenuComponent,
    MenuItemComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    SegmentComponent,
    SegmentItemComponent,
    ViewSlotOutletComponent,
    SettingsSelectionDirective,
    SettingsWorkspaceContextDirective,
  ],
  providers: [
    SettingsHostSession,
    SettingsViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: SettingsViewPresenter },
  ],
  templateUrl: './SettingsView.html',
  styleUrl: './SettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsView extends View<SettingsViewPresenter> {
  // #region Fields

  private readonly _changeDetector = inject(ChangeDetectorRef);
  /**
   * Global feature-card extension point.
   *
   * @protected
   * @readonly
   */
  protected readonly globalSlot = SettingsViewSlot.Global;
  /** Header actions owned by their contributing features. @protected @readonly */
  protected readonly headerActionsSlot = SettingsViewSlot.HeaderActions;
  /**
   * Workspace feature-card extension point.
   *
   * @protected
   * @readonly
   */
  protected readonly workspaceSlot = SettingsViewSlot.Workspace;

  // #endregion

  // #region Ctor

  /**
   * Retains the route's existing render scheduling after hydration.
   *
   * @public
   */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }

  // #endregion
}
