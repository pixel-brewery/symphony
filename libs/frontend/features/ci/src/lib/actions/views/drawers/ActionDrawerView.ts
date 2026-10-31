// #region Imports

import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActionStateLabelPipe } from '../../../pipes/ActionStateLabelPipe';
import {
  AnchorComponent,
  ButtonComponent,
  DisclosureComponent,
  DismissComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  EmptyStateComponent,
  HintComponent,
  IconNameDirective,
  ProgressRingComponent,
  SkeletonComponent,
  TextBoxComponent,
  TimelineComponent,
  TimelineContentComponent,
  TimelineItemComponent,
  TimelineMarkerComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { DatePipe } from '@angular/common';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  CiJobGraphComponent,
  CiLogStatusIconPipe,
  CiLogStatusLabelPipe,
  CiLogStatusVariantPipe,
} from '@symphony/frontend-ui';
import { ActionDrawerViewPresenter } from '../../view-presenters/ActionDrawerViewPresenter';

// #endregion

@Component({
  selector: 'symphony-action-drawer-view',
  host: { class: 'block' },
  imports: [
    FormsModule,
    ActionStateLabelPipe,
    CiJobGraphComponent,
    AnchorComponent,
    ButtonComponent,
    CiLogStatusIconPipe,
    CiLogStatusLabelPipe,
    CiLogStatusVariantPipe,
    DatePipe,
    DisclosureComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    DismissComponent,
    EmptyStateComponent,
    HintComponent,
    IconNameDirective,
    ProgressRingComponent,
    SkeletonComponent,
    TextBoxComponent,
    TimelineComponent,
    TimelineContentComponent,
    TimelineItemComponent,
    TimelineMarkerComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: ActionDrawerViewPresenter }],
  templateUrl: './ActionDrawerView.html',
  styleUrl: './ActionDrawerView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionDrawerView extends View<ActionDrawerViewPresenter> {}
