// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  AvatarComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CellComponent,
  CellGroupComponent,
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
  ToggleSwitchComponent,
  IconNameDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent, SelectionAppearancePipe } from '@symphony/frontend-ui';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { WorkSourceSettingsEditorViewPresenter } from './WorkSourceSettingsEditorViewPresenter';

// #endregion

@Component({
  selector: 'symphony-work-source-settings-editor-view',
  host: { class: 'block' },
  imports: [
    NgTemplateOutlet,
    AvatarComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CellComponent,
    CellGroupComponent,
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
    SelectionAppearancePipe,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    IconNameDirective,
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
