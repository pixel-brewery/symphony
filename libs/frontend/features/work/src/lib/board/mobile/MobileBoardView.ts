// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent,
  ExpanderComponent,
  ExpanderGroupComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { MobileBoardViewPresenter } from './MobileBoardViewPresenter';
import { MobileTicketCardView } from './MobileTicketCardView';

// #endregion

@Component({
  selector: 'symphony-mobile-board-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    ExpanderComponent,
    ExpanderGroupComponent,
    MobileTicketCardView,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    RouterLink,
  ],
  providers: [
    MobileBoardViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileBoardViewPresenter },
  ],
  templateUrl: './MobileBoardView.html',
  styleUrl: './MobileBoardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileBoardView extends View<MobileBoardViewPresenter> {}
