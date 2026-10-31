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
  ButtonComponent,
  ChoiceComponent,
  ChoiceGroupComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  ExpanderComponent,
  MessageComponent,
  PasswordBoxComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsConditionalComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import {
  AiAccountStatusPipe,
  AiRuntimeStatusPipe,
  AiValidationIssuesLabelPipe,
  ConnectionIconPipe,
} from '@symphony/frontend-ui';
import { AiAccountSettingsEditorViewPresenter } from './AiAccountSettingsEditorViewPresenter';

// #endregion

/** The `Connect AI account` / `Edit AI account` sheet of the Settings window. @public */
@Component({
  selector: 'symphony-ai-settings-editor-view',
  host: { class: 'block' },
  imports: [
    AiAccountStatusPipe,
    AiRuntimeStatusPipe,
    AiValidationIssuesLabelPipe,
    ButtonComponent,
    ChoiceComponent,
    ChoiceGroupComponent,
    ConnectionIconPipe,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    ExpanderComponent,
    MessageComponent,
    NgTemplateOutlet,
    PasswordBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SettingsConditionalComponent,
    SettingsRowComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: AiAccountSettingsEditorViewPresenter }],
  templateUrl: './AiAccountSettingsEditorView.html',
  styleUrl: './AiAccountSettingsEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAccountSettingsEditorView extends View<AiAccountSettingsEditorViewPresenter> {
  // #region Fields
  private readonly _changeDetector = inject(ChangeDetectorRef);
  // #endregion
  // #region Ctor
  /** Retains native sheet rendering after the existing hydration lifecycle. @public */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
