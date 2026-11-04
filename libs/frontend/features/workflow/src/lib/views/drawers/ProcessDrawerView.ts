// #region Imports

import { ApplicationDatePipe as DatePipe } from '@symphony/frontend-intl';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  TranslateDirective,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CellComponent,
  CellGroupComponent,
  ChipComponent,
  DismissComponent,
  DividerComponent,
  DrawerContentDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  EmptyStateComponent,
  HintComponent,
  IconNameDirective,
  SkeletonComponent,
  TextComponent,
  TimelineComponent,
  TimelineContentComponent,
  TimelineItemComponent,
  TimelineMarkerComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  ProcessGraphComponent,
  WorkflowTriggerLabelPipe,
} from '@symphony/frontend-ui/process-graph';
import { WorkflowAuditPresentationPipe } from '../../pipes/WorkflowAuditPresentationPipe';
import { WorkflowRuntimeStatePresentationPipe } from '../../pipes/WorkflowRuntimeStatePresentationPipe';
import { ProcessDrawerViewPresenter } from '../../view-presenters/ProcessDrawerViewPresenter';

// #endregion

@Component({
  selector: 'symphony-process-drawer-view',
  host: { class: 'block' },
  imports: [
    TranslateDirective,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CellComponent,
    CellGroupComponent,
    ChipComponent,
    DatePipe,
    DismissComponent,
    DividerComponent,
    DrawerContentDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    EmptyStateComponent,
    HintComponent,
    IconNameDirective,
    ProcessGraphComponent,
    SkeletonComponent,
    TextComponent,
    TimelineComponent,
    TimelineContentComponent,
    TimelineItemComponent,
    TimelineMarkerComponent,
    TypographyDirective,
    WorkflowAuditPresentationPipe,
    WorkflowRuntimeStatePresentationPipe,
    WorkflowTriggerLabelPipe,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: ProcessDrawerViewPresenter }],
  templateUrl: './ProcessDrawerView.html',
  styleUrl: './ProcessDrawerView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessDrawerView extends View<ProcessDrawerViewPresenter> {}
