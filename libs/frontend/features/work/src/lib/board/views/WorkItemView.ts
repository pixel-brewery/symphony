// #region Imports

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import {
  AvatarComponent,
  BadgeComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellComponent,
  CellGroupComponent,
  CheckboxComponent,
  ChipComponent,
  DividerComponent,
  DotComponent,
  EmptyStateComponent,
  ExpanderComponent,
  FormFieldComponent,
  FormFieldDirective,
  FormFieldStateDirective,
  HintComponent,
  IconComponent,
  IconNameDirective,
  ProgressBarComponent,
  PromptBoxComponent,
  PromptBoxVoiceRecorderToolComponent,
  SegmentComponent,
  SegmentItemComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  SplitComponent,
  TableBodyCellComponent,
  TableBodyComponent,
  TableBodyRowComponent,
  TableComponent,
  TableHeaderCellComponent,
  TableHeaderComponent,
  TableHeaderRowComponent,
  TextBoxComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  CommandDirective,
  PaneSizeDirective,
  View,
  VIEW_PRESENTER,
  WindowToolbarDirective,
} from '@symphony/frontend-core';
import {
  AiDirective,
  BooleanIconPipe,
  BooleanVariantPipe,
  CiRunStatusVariantPipe,
  MarkdownComponent,
  RelativeTimePipe,
  SkillFlowRoleLabelPipe,
} from '@symphony/frontend-ui';
import { WorkItemFieldsComponent } from '../components/WorkItemFieldsComponent';
import { GoalStateLabelPipe } from '../pipes/GoalStateLabelPipe';
import { TaskActionPresentationPipe } from '../pipes/TaskActionPresentationPipe';
import { TaskEventPresentationPipe } from '../pipes/TaskEventPresentationPipe';
import { TaskStatusPresentationPipe } from '../pipes/TaskStatusPresentationPipe';
import { WorkItemCheckDurationPipe } from '../pipes/WorkItemCheckDurationPipe';
import { WorkItemCheckStatusLabelPipe } from '../pipes/WorkItemCheckStatusLabelPipe';
import { WorkItemViewPresenter } from '../view-presenters/WorkItemViewPresenter';

// #endregion

/**
 * The `Work item` screen at `/main/board/:workItemId`: chips, title and description, the five
 * delivery stages, the checks, the acceptance criteria, the steps, the AI team and the activity,
 * with the inspector on the right.
 *
 * @public
 */
@Component({
  selector: 'symphony-work-item-view',
  host: { class: 'flex min-h-0 min-w-0 flex-1' },
  imports: [
    AiDirective,
    AvatarComponent,
    BadgeComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    BooleanIconPipe,
    BooleanVariantPipe,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellComponent,
    CellGroupComponent,
    CheckboxComponent,
    ChipComponent,
    CiRunStatusVariantPipe,
    CommandDirective,
    DatePipe,
    DividerComponent,
    DotComponent,
    EmptyStateComponent,
    ExpanderComponent,
    FormField,
    FormFieldComponent,
    FormFieldDirective,
    FormFieldStateDirective,
    GoalStateLabelPipe,
    HintComponent,
    IconComponent,
    IconNameDirective,
    MarkdownComponent,
    PaneSizeDirective,
    ProgressBarComponent,
    PromptBoxComponent,
    PromptBoxVoiceRecorderToolComponent,
    RelativeTimePipe,
    SegmentComponent,
    SegmentItemComponent,
    SelectComponent,
    SelectItemComponent,
    SkeletonComponent,
    SkillFlowRoleLabelPipe,
    SplitComponent,
    TableBodyCellComponent,
    TableBodyComponent,
    TableBodyRowComponent,
    TableComponent,
    TableHeaderCellComponent,
    TableHeaderComponent,
    TableHeaderRowComponent,
    TaskActionPresentationPipe,
    TaskEventPresentationPipe,
    TaskStatusPresentationPipe,
    TextBoxComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
    WindowToolbarDirective,
    WorkItemCheckDurationPipe,
    WorkItemCheckStatusLabelPipe,
    WorkItemFieldsComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: WorkItemViewPresenter }],
  templateUrl: './WorkItemView.html',
  styleUrl: './WorkItemView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemView extends View<WorkItemViewPresenter> {}
