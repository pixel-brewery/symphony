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
  DismissComponent,
  DividerComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
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
    DismissComponent,
    DividerComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
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
