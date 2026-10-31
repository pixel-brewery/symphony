// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvatarComponent, ButtonComponent } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { WorkConnectionsSettingsViewPresenter } from './WorkConnectionsSettingsViewPresenter';
// #endregion
/** Contents-only feature contribution to the existing Services card. @public */
@Component({
  selector: 'symphony-work-boards-settings-view',
  host: { class: 'contents' },
  imports: [AvatarComponent, ButtonComponent, SettingsGroupComponent, SettingsRowComponent],
  providers: [WorkConnectionsSettingsViewPresenter],
  templateUrl: './WorkBoardsSettingsView.html',
  styleUrl: './WorkBoardsSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkBoardsSettingsView {
  // #region Fields
  /** Actual feature-owned projections and commands. @protected @readonly */
  protected readonly presenter = inject(WorkConnectionsSettingsViewPresenter);
  // #endregion
}
