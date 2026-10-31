// #region Imports

import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
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
  DividerComponent,
  ExpanderComponent,
  FileBoxComponent,
  MessageComponent,
  ProgressBarComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { GithubActionsAccountLabelPipe } from '@symphony/frontend-feature-ci/presentation';
import { SettingsConditionalComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { BooleanVariantPipe } from '@symphony/frontend-ui';
import { RepositoryValidationIssuesLabelPipe } from '../pipes/RepositoryValidationIssuesLabelPipe';
import { DeliverySettingsEditorViewPresenter } from './DeliverySettingsEditorViewPresenter';

// #endregion

/** The repository and delivery-destination sheets of the Settings window. @public */
@Component({
  selector: 'symphony-delivery-settings-editor-view',
  host: { class: 'block' },
  imports: [
    BooleanVariantPipe,
    ButtonComponent,
    ChoiceComponent,
    ChoiceGroupComponent,
    DatePipe,
    DecimalPipe,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DividerComponent,
    ExpanderComponent,
    FileBoxComponent,
    GithubActionsAccountLabelPipe,
    MessageComponent,
    NgTemplateOutlet,
    ProgressBarComponent,
    RepositoryValidationIssuesLabelPipe,
    SelectComponent,
    SelectItemComponent,
    SettingsConditionalComponent,
    SettingsRowComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: DeliverySettingsEditorViewPresenter }],
  templateUrl: './DeliverySettingsEditorView.html',
  styleUrl: './DeliverySettingsEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliverySettingsEditorView extends View<DeliverySettingsEditorViewPresenter> {
  // #region Fields
  private readonly _changeDetector = inject(ChangeDetectorRef);
  // #endregion
  // #region Ctor
  /** Preserves native post-hydration sheet rendering. @public */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
