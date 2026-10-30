// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  DividerComponent,
  NumberBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent, StorageBreakdownComponent } from '@symphony/frontend-ui';
import { WorkspaceSettingsViewPresenter } from './WorkspaceSettingsViewPresenter';

// #endregion

/**
 * Feature-owned Workspace settings card.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-administration-card',
  host: { class: 'block' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    DividerComponent,
    NumberBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    HeadlineComponent,
    StorageBreakdownComponent,
    IconNameDirective,
  ],
  providers: [WorkspaceSettingsViewPresenter],
  templateUrl: './WorkspaceAdministrationCardView.html',
  styleUrl: './WorkspaceAdministrationCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceAdministrationCardView {
  // #region Fields

  /**
   * Workspace-owned state and actions.
   *
   * @protected
   * @readonly
   */
  protected readonly presenter = inject(WorkspaceSettingsViewPresenter);

  // #endregion
}
