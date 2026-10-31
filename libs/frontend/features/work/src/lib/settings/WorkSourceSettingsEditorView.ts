// #region Imports

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  ExpanderComponent,
  MessageComponent,
  PasswordBoxComponent,
  SearchBoxComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsConditionalComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { SelectionAppearancePipe } from '@symphony/frontend-ui';
import { AzureDevOpsValidationIssuesLabelPipe } from './AzureDevOpsValidationIssuesLabelPipe';
import { WorkSourceSettingsEditorViewPresenter } from './WorkSourceSettingsEditorViewPresenter';

// #endregion

/** The GitHub Projects board and Azure DevOps source sheets of the Settings window. @public */
@Component({
  selector: 'symphony-work-source-settings-editor-view',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    AzureDevOpsValidationIssuesLabelPipe,
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    ExpanderComponent,
    MessageComponent,
    NgTemplateOutlet,
    PasswordBoxComponent,
    SearchBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SelectionAppearancePipe,
    SettingsConditionalComponent,
    SettingsRowComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: WorkSourceSettingsEditorViewPresenter }],
  templateUrl: './WorkSourceSettingsEditorView.html',
  styleUrl: './WorkSourceSettingsEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkSourceSettingsEditorView extends View<WorkSourceSettingsEditorViewPresenter> {
  // #region Fields

  private readonly _changeDetector = inject(ChangeDetectorRef);

  // #endregion

  // #region Ctor

  public constructor() {
    super();
    effect(() => {
      if (this.presenter.isHydrating()) return;
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }

  // #endregion
}
