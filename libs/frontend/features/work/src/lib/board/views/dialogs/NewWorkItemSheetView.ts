// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import {
  BadgeComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CheckboxComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  DropDownButtonComponent,
  ExpanderComponent,
  FormFieldComponent,
  FormFieldStateDirective,
  MenuComponent,
  MenuItemComponent,
  ProgressBarComponent,
  PromptBoxComponent,
  PromptBoxVoiceRecorderToolComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
  FormFieldDirective,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { AiDirective } from '@symphony/frontend-ui';
import { WorkItemFieldsComponent } from '../../components/WorkItemFieldsComponent';
import { NewWorkItemSheetViewPresenter } from '../../view-presenters/NewWorkItemSheetViewPresenter';

// #endregion

/**
 * The `New work item` sheet: a modal hanging below the toolbar with `Write it myself` /
 * `Draft with AI`, title, description, repository, column, labels, the analysis after creating,
 * `Cancel` and `Create work item`.
 *
 * @public
 */
@Component({
  selector: 'symphony-new-work-item-sheet-view',
  imports: [
    IconNameDirective,
    FormFieldDirective,
    AiDirective,
    BadgeComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CheckboxComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DropDownButtonComponent,
    ExpanderComponent,
    FormField,
    FormFieldComponent,
    FormFieldStateDirective,
    MenuComponent,
    MenuItemComponent,
    ProgressBarComponent,
    PromptBoxComponent,
    PromptBoxVoiceRecorderToolComponent,
    SelectComponent,
    SelectItemComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
    WorkItemFieldsComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: NewWorkItemSheetViewPresenter }],
  templateUrl: './NewWorkItemSheetView.html',
  styleUrl: './NewWorkItemSheetView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewWorkItemSheetView extends View<NewWorkItemSheetViewPresenter> {}
