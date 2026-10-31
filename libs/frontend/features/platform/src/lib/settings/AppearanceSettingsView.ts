// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { ViewSlotOutletComponent } from '@pixel-brewery/mosaik-elements-angular';
import {
  SettingsGroupComponent,
  SettingsRowComponent,
  SettingsViewSlot,
} from '@symphony/frontend-setting';
import { AppearanceSettingsViewPresenter } from './AppearanceSettingsViewPresenter';
import { ThemeSegmentView } from './ThemeSegmentView';

// #endregion

/**
 * Appearance › `Color theme`, followed by the cards other features add to Appearance.
 *
 * @public
 */
@Component({
  selector: 'symphony-appearance-settings',
  host: { class: 'contents' },
  imports: [
    SettingsGroupComponent,
    SettingsRowComponent,
    ThemeSegmentView,
    ViewSlotOutletComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: AppearanceSettingsViewPresenter }],
  templateUrl: './AppearanceSettingsView.html',
  styleUrl: './AppearanceSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceSettingsView extends View<AppearanceSettingsViewPresenter> {
  // #region Fields

  /**
   * Existing appearance extension point.
   *
   * @protected
   * @readonly
   */
  protected readonly appearanceSlot = SettingsViewSlot.Appearance;

  // #endregion
}
