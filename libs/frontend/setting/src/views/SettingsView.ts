// #region Imports

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  TextComponent,
  TypographyDirective,
  ViewSlotOutletComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER, WindowToolbar } from '@symphony/frontend-core';
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
 * The Settings window's body: the sidebar, a 52px toolbar with the section's name and one-line
 * description, and the selected section's feature-contributed cards or the search results.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-view',
  host: { class: 'block' },
  imports: [
    NgTemplateOutlet,
    SettingsSearchView,
    SettingsSelectionDirective,
    SettingsSidebarView,
    SettingsWorkspaceContextDirective,
    TextComponent,
    TypographyDirective,
    ViewSlotOutletComponent,
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
   * Contextual actions a section registered through `WindowToolbarDirective`.
   *
   * @protected
   * @readonly
   */
  protected readonly toolbar = inject(WindowToolbar);

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
