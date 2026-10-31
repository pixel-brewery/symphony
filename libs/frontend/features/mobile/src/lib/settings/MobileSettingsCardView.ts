// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { MobileSettingsCardViewPresenter } from './MobileSettingsCardViewPresenter';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  CellComponent,
  DividerComponent,
  HintComponent,
  QRCodeComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { MobileAccessStatusLabelPipe } from '../pipes/MobileAccessStatusLabelPipe';
import { NgTemplateOutlet } from '@angular/common';

// #endregion

/**
 * Mobile-owned desktop access, pairing and phone management card.
 *
 * @public
 */
@Component({
  selector: 'symphony-mobile-settings-card',
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
    CellComponent,
    DividerComponent,
    HeadlineComponent,
    HintComponent,
    MobileAccessStatusLabelPipe,
    NgTemplateOutlet,
    QRCodeComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    IconNameDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: MobileSettingsCardViewPresenter }],
  templateUrl: './MobileSettingsCardView.html',
  styleUrl: './MobileSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileSettingsCardView extends View<MobileSettingsCardViewPresenter> {}
