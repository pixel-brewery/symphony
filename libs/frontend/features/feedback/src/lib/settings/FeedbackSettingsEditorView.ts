// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  DismissComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  HintComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { FeedbackSettingsEditorViewPresenter } from './FeedbackSettingsEditorViewPresenter';

// #endregion

/** The existing channel drawer rendered by its canonical feature owner. @public */
@Component({
  selector: 'symphony-feedback-settings-editor-view',
  host: { class: 'block' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    DismissComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    HeadlineComponent,
    HintComponent,
    SelectComponent,
    SelectItemComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    IconNameDirective,
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

  /** Preserves the existing drawer's render scheduling after hydration. @public */
  public constructor() {
    super();
    effect(() => {
      if (this.presenter.isHydrating()) return;
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }

  // #endregion
}
