// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  SelectComponent,
  SelectItemComponent,
  ViewSlotOutletComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { SettingsViewSlot } from '@symphony/frontend-setting';
import { AppearanceSettingsViewPresenter } from './AppearanceSettingsViewPresenter';

// #endregion

/**
 * Feature-owned Settings card composed by the native host.
 *
 * @public
 */
@Component({
  selector: 'symphony-appearance-settings',
  host: { class: 'contents' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    SelectComponent,
    SelectItemComponent,
    ViewSlotOutletComponent,
    HeadlineComponent,
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
