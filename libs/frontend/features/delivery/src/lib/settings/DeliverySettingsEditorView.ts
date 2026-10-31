// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChoiceComponent,
  ChoiceGroupComponent,
  TypographyDirective,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CellComponent,
  CellGroupComponent,
  DismissComponent,
  DividerComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  ExpanderComponent,
  FileBoxComponent,
  HintComponent,
  IconNameDirective,
  ProgressBarComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { BooleanVariantPipe, HeadlineComponent } from '@symphony/frontend-ui';
import { GithubActionsAccountLabelPipe } from '@symphony/frontend-feature-ci/presentation';
import { DeliverySettingsEditorViewPresenter } from './DeliverySettingsEditorViewPresenter';

// #endregion

/** The existing two Delivery editor forms mounted by native Settings registration. @public */
@Component({
  selector: 'symphony-delivery-settings-editor-view',
  host: { class: 'block' },
  imports: [
    ChoiceComponent,
    ChoiceGroupComponent,
    TypographyDirective,
    DatePipe,
    DecimalPipe,
    ChoiceComponent,
    ChoiceGroupComponent,
    TypographyDirective,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    BooleanVariantPipe,
    ButtonComponent,
    CellComponent,
    CellGroupComponent,
    DismissComponent,
    DividerComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    ExpanderComponent,
    FileBoxComponent,
    HeadlineComponent,
    HintComponent,
    IconNameDirective,
    ProgressBarComponent,
    SelectComponent,
    SelectItemComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    GithubActionsAccountLabelPipe,
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
  /** Preserves native post-hydration drawer rendering. @public */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
