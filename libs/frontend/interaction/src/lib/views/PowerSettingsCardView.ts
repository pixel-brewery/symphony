// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellComponent,
  HintComponent,
  SkeletonComponent,
  TextComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { PowerSettingsCardViewPresenter } from '../view-presenters/PowerSettingsCardViewPresenter';
import { KeepAwakeDetailsPipe } from '../pipes/KeepAwakeDetailsPipe';
import { KeepAwakeStatusLabelPipe } from '../pipes/KeepAwakeStatusLabelPipe';

// #endregion

/**
 * The existing Sleep settings card, owned by the desktop interaction capability.
 *
 * @public
 */
@Component({
  selector: 'symphony-power-settings-card',
  host: { class: 'block' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellComponent,
    HeadlineComponent,
    HintComponent,
    KeepAwakeDetailsPipe,
    KeepAwakeStatusLabelPipe,
    NgTemplateOutlet,
    SkeletonComponent,
    TextComponent,
    ToggleSwitchComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: PowerSettingsCardViewPresenter }],
  templateUrl: './PowerSettingsCardView.html',
  styleUrl: './PowerSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PowerSettingsCardView extends View<PowerSettingsCardViewPresenter> {}
