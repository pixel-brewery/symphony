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
  DismissComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  HintComponent,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { mosaikEventText } from '@symphony/frontend-setting';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { WorkspaceSettingsEditorViewPresenter } from './WorkspaceSettingsEditorViewPresenter';

// #endregion

/**
 * Workspace-owned create and edit drawer.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-settings-editor-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    DismissComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    HeadlineComponent,
    HintComponent,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
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
   * Preserves the existing drawer's native render scheduling after hydration.
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
