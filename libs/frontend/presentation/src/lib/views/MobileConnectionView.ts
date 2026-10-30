// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  HintComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectItemComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { MobileConnectionViewPresenter } from '../view-presenters/MobileConnectionViewPresenter';

// #endregion

@Component({
  selector: 'symphony-mobile-connection-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    HintComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    SelectComponent,
    SelectItemComponent,
  ],
  providers: [
    MobileConnectionViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileConnectionViewPresenter },
  ],
  templateUrl: './MobileConnectionView.html',
  styleUrl: './MobileConnectionView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileConnectionView extends View<MobileConnectionViewPresenter> {}
