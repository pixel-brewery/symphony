// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import { ViewSlotOutletComponent } from '@pixel-brewery/mosaik-elements-angular';
import {
  View,
  VIEW_PRESENTER,
  WindowSidebarDirective,
  WindowToolbarDirective,
} from '@symphony/frontend-core';
import { SettingsHostSession } from '../context/SettingsHostSession';
import { SettingsSelectionDirective } from '../context/SettingsSelectionDirective';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { SettingsWorkspaceContextDirective } from '../context/SettingsWorkspaceContextDirective';
import { SettingsSearchIndex } from '../search/SettingsSearchIndex';
import { SettingsViewPresenter } from '../view-presenters/SettingsViewPresenter';
import { SettingsSearchView } from './SettingsSearchView';
import { SettingsSidebarView } from './SettingsSidebarView';

// #endregion

/**
 * Settings inside the main window: it replaces the sidebar's destinations with the Settings
 * navigation, hands the section's name, description and actions to the window toolbar, and shows
 * the selected section's feature-contributed cards or the search results.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-view',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  imports: [
    SettingsSearchView,
    SettingsSelectionDirective,
    SettingsSidebarView,
    SettingsWorkspaceContextDirective,
    ViewSlotOutletComponent,
    WindowSidebarDirective,
    WindowToolbarDirective,
  ],
  providers: [
    SettingsHostSession,
    SettingsSearchIndex,
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
