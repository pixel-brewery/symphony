// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AnchorComponent,
  AvatarComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CommentComponent,
  DismissComponent,
  DrawerContentDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  EmptyStateComponent,
  HintComponent,
  IconNameDirective,
  ProgressRingComponent,
  SkeletonComponent,
  TextComponent,
  TimelineComponent,
  TimelineContentComponent,
  TimelineItemComponent,
  TimelineMarkerComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { DatePipe } from '@angular/common';
import { ExecutionDrawerTitlePipe } from '../../pipes/ExecutionDrawerTitlePipe';
import { ExecutionEventIconPipe } from '../../pipes/ExecutionEventIconPipe';
import { ExecutionEventLabelPipe } from '../../pipes/ExecutionEventLabelPipe';
import { ExecutionEventVariantPipe } from '../../pipes/ExecutionEventVariantPipe';
import {
  AgentFigureComponent,
  AgentStateLabelPipe,
  InitialsPipe,
  MarkdownComponent,
} from '@symphony/frontend-ui';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { ExecutionDrawerViewPresenter } from '../../view-presenters/ExecutionDrawerViewPresenter';

// #endregion

@Component({
  selector: 'symphony-execution-drawer-view',
  host: { class: 'block' },
  imports: [
    AgentFigureComponent,
    AgentStateLabelPipe,
    AnchorComponent,
    AvatarComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CommentComponent,
    DatePipe,
    DrawerContentDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    DismissComponent,
    EmptyStateComponent,
    ExecutionDrawerTitlePipe,
    ExecutionEventIconPipe,
    ExecutionEventLabelPipe,
    ExecutionEventVariantPipe,
    HintComponent,
    IconNameDirective,
    InitialsPipe,
    MarkdownComponent,
    ProgressRingComponent,
    SkeletonComponent,
    TimelineComponent,
    TimelineContentComponent,
    TimelineItemComponent,
    TimelineMarkerComponent,
    TextComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: ExecutionDrawerViewPresenter }],
  templateUrl: './ExecutionDrawerView.html',
  styleUrl: './ExecutionDrawerView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutionDrawerView extends View<ExecutionDrawerViewPresenter> {}
