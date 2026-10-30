// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  PagePreContentComponent,
  SearchBoxComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { MobileTicketCardView } from './MobileTicketCardView';
import { MobileTicketsViewPresenter } from './MobileTicketsViewPresenter';

// #endregion

@Component({
  selector: 'symphony-mobile-tickets-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    MobileTicketCardView,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    PagePreContentComponent,
    SearchBoxComponent,
    RouterLink,
  ],
  providers: [
    MobileTicketsViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileTicketsViewPresenter },
  ],
  templateUrl: './MobileTicketsView.html',
  styleUrl: './MobileTicketsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTicketsView extends View<MobileTicketsViewPresenter> {}
