// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellComponent,
  CellGroupComponent,
  IconNameDirective,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  PromptBoxComponent,
  SelectComponent,
  SelectItemComponent,
  TextComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { AiDirective } from '@symphony/frontend-ui/mobile';
import { MobileTicketActionVariantPipe } from '../pipes/MobileTicketActionVariantPipe';
import { MobileTicketPromptLabelPipe } from '../pipes/MobileTicketPromptLabelPipe';
import { MobileTicketPromptPlaceholderPipe } from '../pipes/MobileTicketPromptPlaceholderPipe';
import { MobileTicketDetailViewPresenter } from './MobileTicketDetailViewPresenter';

// #endregion

@Component({
  selector: 'symphony-mobile-ticket-detail-view',
  host: { class: 'block' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    BadgeComponent,
    AiDirective,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellComponent,
    CellGroupComponent,
    IconNameDirective,
    MobileTicketActionVariantPipe,
    MobileTicketPromptLabelPipe,
    MobileTicketPromptPlaceholderPipe,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    PromptBoxComponent,
    SelectComponent,
    SelectItemComponent,
    TextComponent,
  ],
  providers: [
    MobileTicketDetailViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileTicketDetailViewPresenter },
  ],
  templateUrl: './MobileTicketDetailView.html',
  styleUrl: './MobileTicketDetailView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTicketDetailView extends View<MobileTicketDetailViewPresenter> {}
