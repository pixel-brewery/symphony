// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  MessageComponent,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  SettingsConditionalComponent,
  SettingsGroupComponent,
  SettingsRowComponent,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { CiSettingsViewPresenter } from '../CiSettingsViewPresenter';

// #endregion

/**
 * Local GitHub Actions of one workspace: whether it runs workflows locally, the guest image it
 * reproduces, and what its repositories provision inside that guest. Every control applies as soon
 * as it changes; setup scripts when their editor loses focus. The machine specification these boot
 * is host-owned and configured once for this Mac.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-local-ci-card',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    MessageComponent,
    SelectComponent,
    SelectItemComponent,
    SettingsConditionalComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
  ],
  templateUrl: './WorkspaceLocalCiCardView.html',
  styleUrl: './WorkspaceLocalCiCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLocalCiCardView {
  // #region Fields

  /**
   * The workspace.
   *
   * @public
   * @readonly
   */
  public readonly workspace = input.required<ApplicationSettingsDto['workspaces'][number]>();
  protected readonly presenter = inject(CiSettingsViewPresenter);
  private readonly _changeDetector = inject(ChangeDetectorRef);

  // #endregion

  // #region Ctor

  public constructor() {
    effect(() => {
      this.presenter.workspaceLocalCiEnabled()(this.workspace().id);
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }

  // #endregion
}
