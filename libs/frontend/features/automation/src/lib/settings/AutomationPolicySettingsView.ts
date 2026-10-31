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
  DividerComponent,
  FileBoxComponent,
  HintComponent,
  NumberBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { DisplayNamesPipe } from '../pipes/DisplayNamesPipe';
import { AutomationPolicySettingsViewPresenter } from './AutomationPolicySettingsViewPresenter';

// #endregion

/**
 * Feature-owned Settings card composed by the native host.
 *
 * @public
 */
@Component({
  selector: 'symphony-automation-policy-settings',
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
    DividerComponent,
    FileBoxComponent,
    HintComponent,
    NumberBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    HeadlineComponent,
    DisplayNamesPipe,
    IconNameDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: AutomationPolicySettingsViewPresenter }],
  templateUrl: './AutomationPolicySettingsView.html',
  styleUrl: './AutomationPolicySettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomationPolicySettingsView extends View<AutomationPolicySettingsViewPresenter> {}
