// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { AiAccountSettingsEditorViewPresenter } from './AiAccountSettingsEditorViewPresenter';
import {
  AiAccountStatusPipe,
  AiRuntimeStatusPipe,
  AiValidationIssuesLabelPipe,
  ConnectionIconPipe,
  HeadlineComponent,
} from '@symphony/frontend-ui';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CellComponent,
  CellGroupComponent,
  ChoiceComponent,
  ChoiceGroupComponent,
  DismissComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  ExpanderComponent,
  HintComponent,
  PasswordBoxComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';

// #endregion

/** Feature-owned Settings drawer using the existing Mosaik anatomy. @public */
@Component({
  selector: 'symphony-ai-settings-editor-view',
  host: { class: 'block' },
  imports: [
    AiAccountStatusPipe,
    AiRuntimeStatusPipe,
    AiValidationIssuesLabelPipe,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CellComponent,
    CellGroupComponent,
    ConnectionIconPipe,
    ChoiceComponent,
    ChoiceGroupComponent,
    DismissComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    ExpanderComponent,
    HeadlineComponent,
    HintComponent,
    PasswordBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
    IconNameDirective,
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
  /** Retains native drawer rendering after the existing hydration lifecycle. @public */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
