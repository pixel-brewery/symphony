// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AvatarComponent,
  BadgeComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CheckboxComponent,
  DateBoxComponent,
  HintComponent,
  NumberBoxComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  PromptBoxComponent,
  SelectComponent,
  SelectItemComponent,
  SegmentComponent,
  SegmentItemComponent,
  TextBoxComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { AiDirective } from '@symphony/frontend-ui/mobile';
import { MobileWorkItemCreateViewPresenter } from './MobileWorkItemCreateViewPresenter';

// #endregion

@Component({
  selector: 'symphony-mobile-work-item-create-view',
  host: { class: 'block' },
  imports: [
    AiDirective,
    AvatarComponent,
    BadgeComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CheckboxComponent,
    DateBoxComponent,
    HintComponent,
    NumberBoxComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    PromptBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SegmentComponent,
    SegmentItemComponent,
    TextBoxComponent,
  ],
  providers: [
    MobileWorkItemCreateViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileWorkItemCreateViewPresenter },
  ],
  templateUrl: './MobileWorkItemCreateView.html',
  styleUrl: './MobileWorkItemCreateView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileWorkItemCreateView extends View<MobileWorkItemCreateViewPresenter> {}
