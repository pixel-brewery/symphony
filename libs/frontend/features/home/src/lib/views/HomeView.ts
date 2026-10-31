// #region Imports

import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BadgeComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  IconComponent,
  IconNameDirective,
  ProgressBarComponent,
  SegmentBarComponent,
  SegmentBarItemComponent,
  SegmentComponent,
  SegmentItemComponent,
  SkeletonComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER, WindowToolbarDirective } from '@symphony/frontend-core';
import { RelativeTimePipe } from '@symphony/frontend-ui';
import { ChangeVariantPipe } from '../pipes/ChangeVariantPipe';
import { ExternalServiceIncidentImpactPipe } from '../pipes/ExternalServiceIncidentImpactPipe';
import { GreetingPipe } from '../pipes/GreetingPipe';
import { InboxEntryIconPipe } from '../pipes/InboxEntryIconPipe';
import { InboxEntrySubtitlePipe } from '../pipes/InboxEntrySubtitlePipe';
import { InboxEntryTitlePipe } from '../pipes/InboxEntryTitlePipe';
import { InboxEntryVariantPipe } from '../pipes/InboxEntryVariantPipe';
import { SignedNumberPipe } from '../pipes/SignedNumberPipe';
import { HomeViewPresenter } from '../view-presenters/HomeViewPresenter';

// #endregion

/**
 * Overview, the start page: the greeting with what needs attention, the quick actions, the
 * `Waiting for you`, `Pull requests` and `Production` cards, and `Reporting` for a period.
 *
 * @public
 */
@Component({
  selector: 'symphony-home-view',
  host: { class: 'flex min-w-0 flex-1 flex-col' },
  imports: [
    BadgeComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    ChangeVariantPipe,
    DatePipe,
    DecimalPipe,
    ExternalServiceIncidentImpactPipe,
    GreetingPipe,
    IconComponent,
    IconNameDirective,
    InboxEntryIconPipe,
    InboxEntrySubtitlePipe,
    InboxEntryTitlePipe,
    InboxEntryVariantPipe,
    ProgressBarComponent,
    RelativeTimePipe,
    SegmentBarComponent,
    SegmentBarItemComponent,
    SegmentComponent,
    SegmentItemComponent,
    SignedNumberPipe,
    SkeletonComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
    WindowToolbarDirective,
  ],
  providers: [HomeViewPresenter, { provide: VIEW_PRESENTER, useExisting: HomeViewPresenter }],
  templateUrl: './HomeView.html',
  styleUrl: './HomeView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeView extends View<HomeViewPresenter> {}
