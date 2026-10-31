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
