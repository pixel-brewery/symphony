// #region Imports

import { AsyncPipe } from '@angular/common';
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
  IconNameDirective,
  MessageComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { mosaikEventText, SettingsRowComponent } from '@symphony/frontend-setting';
import { WorkspaceAvatarSourcePipe } from '@symphony/frontend-ui';
import { WorkspaceSettingsEditorViewPresenter } from './WorkspaceSettingsEditorViewPresenter';

// #endregion

/**
 * Workspace-owned `Add workspace` / `Edit workspace` sheet.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-settings-editor-view',
  host: { class: 'block' },
  imports: [
    AsyncPipe,
    AvatarComponent,
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    IconNameDirective,
    MessageComponent,
    SettingsRowComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
    WorkspaceAvatarSourcePipe,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: WorkspaceSettingsEditorViewPresenter }],
  templateUrl: './WorkspaceSettingsEditorView.html',
  styleUrl: './WorkspaceSettingsEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsEditorView extends View<WorkspaceSettingsEditorViewPresenter> {
  // #region Fields

  private readonly _changeDetector = inject(ChangeDetectorRef);
  /** Native input parsing belongs to the owning View. @protected @readonly */
  protected readonly eventText = (event: unknown): string => mosaikEventText(event) ?? '';
  /** Shows the configured short code while the preview is loading. @protected @readonly */
  protected readonly shortCodeAccessor = (value: string): string => value.slice(0, 2).toUpperCase();

  // #endregion

  // #region Ctor

  /**
   * Preserves the sheet's native render scheduling after hydration.
   *
   * @public
   */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }

  // #endregion
}
