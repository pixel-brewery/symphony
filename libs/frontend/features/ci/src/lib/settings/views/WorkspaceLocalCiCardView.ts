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
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  CellComponent,
  IconNameDirective,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { CiSettingsViewPresenter } from '../CiSettingsViewPresenter';

// #endregion

/**
 * Local GitHub Actions of one workspace: whether it runs workflows locally, the guest image it
 * reproduces, and what its repositories provision inside that guest. The machine specification
 * these boot is host-owned and lives on its own card under Automation.
 */
@Component({
  selector: 'symphony-workspace-local-ci-card',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    CellComponent,
    HeadlineComponent,
    IconNameDirective,
    SelectComponent,
    SelectItemComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
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
