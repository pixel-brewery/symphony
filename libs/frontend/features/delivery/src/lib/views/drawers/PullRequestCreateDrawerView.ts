// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CheckboxComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  DismissComponent,
  DividerComponent,
  EmptyStateComponent,
  ExpanderComponent,
  FormFieldComponent,
  FormFieldDirective,
  FormFieldStateDirective,
  HintComponent,
  IconComponent,
  IconNameDirective,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextComponent,
  TextBoxComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { MarkdownComponent } from '@symphony/frontend-ui';
import { PullRequestComparisonPresentationPipe } from '../../pipes/PullRequestComparisonPresentationPipe';
import { ShortRevisionPipe } from '../../pipes/ShortRevisionPipe';
import { PullRequestCreateDrawerViewPresenter } from '../../view-presenters/PullRequestCreateDrawerViewPresenter';

// #endregion

/**
 * The `New pull request` sheet: base and compare, what the range carries, and the description.
 *
 * @public
 */
@Component({
  selector: 'symphony-pull-request-create-drawer-view',
  host: { class: 'block' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CheckboxComponent,
    DatePipe,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DismissComponent,
    DividerComponent,
    EmptyStateComponent,
    ExpanderComponent,
    FormField,
    FormFieldComponent,
    FormFieldDirective,
    FormFieldStateDirective,
    HintComponent,
    IconComponent,
    IconNameDirective,
    MarkdownComponent,
    PullRequestComparisonPresentationPipe,
    SelectComponent,
    SelectItemComponent,
    ShortRevisionPipe,
    SkeletonComponent,
    TextComponent,
    TextBoxComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: PullRequestCreateDrawerViewPresenter }],
  templateUrl: './PullRequestCreateDrawerView.html',
  styleUrl: './PullRequestCreateDrawerView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullRequestCreateDrawerView extends View<PullRequestCreateDrawerViewPresenter> {}
