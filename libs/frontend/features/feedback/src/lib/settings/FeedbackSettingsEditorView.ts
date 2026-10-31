// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  MessageComponent,
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
import { FeedbackSettingsEditorViewPresenter } from './FeedbackSettingsEditorViewPresenter';
import { TeamsFeedbackValidationIssuesLabelPipe } from './TeamsFeedbackValidationIssuesLabelPipe';

// #endregion

/** The Microsoft Teams feedback intake sheet of the Settings window. @public */
@Component({
  selector: 'symphony-feedback-settings-editor-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    MessageComponent,
    SelectComponent,
    SelectItemComponent,
    SettingsConditionalComponent,
    SettingsRowComponent,
    SkeletonComponent,
    TeamsFeedbackValidationIssuesLabelPipe,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: FeedbackSettingsEditorViewPresenter }],
  templateUrl: './FeedbackSettingsEditorView.html',
  styleUrl: './FeedbackSettingsEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackSettingsEditorView extends View<FeedbackSettingsEditorViewPresenter> {
  // #region Fields

  private readonly _changeDetector = inject(ChangeDetectorRef);

  // #endregion

  // #region Ctor

  /** Preserves the sheet's render scheduling after hydration. @public */
  public constructor() {
    super();
    effect(() => {
      if (this.presenter.isHydrating()) return;
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }

  // #endregion
}
