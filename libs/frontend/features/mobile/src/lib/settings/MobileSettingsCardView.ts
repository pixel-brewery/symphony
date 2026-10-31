// #region Imports

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  DotComponent,
  IconNameDirective,
  MessageComponent,
  QRCodeComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { MobileAccessStatusLabelPipe } from '../pipes/MobileAccessStatusLabelPipe';
import { MobileSettingsCardViewPresenter } from './MobileSettingsCardViewPresenter';

// #endregion

/**
 * Mobile access: local network access, pairing a phone and the paired phones.
 *
 * @public
 */
@Component({
  selector: 'symphony-mobile-settings-card',
  host: { class: 'contents' },
  imports: [
    ButtonComponent,
    DatePipe,
    DotComponent,
    IconNameDirective,
    MessageComponent,
    MobileAccessStatusLabelPipe,
    QRCodeComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: MobileSettingsCardViewPresenter }],
  templateUrl: './MobileSettingsCardView.html',
  styleUrl: './MobileSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileSettingsCardView extends View<MobileSettingsCardViewPresenter> {}
