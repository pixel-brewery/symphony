// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvatarComponent, ButtonComponent } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsRowComponent } from '@symphony/frontend-setting';
import { WorkConnectionsSettingsViewPresenter } from './WorkConnectionsSettingsViewPresenter';
// #endregion
/** Contents-only feature contribution to the existing Services card. @public */
@Component({
  selector: 'symphony-work-available-connections-view',
  host: { class: 'block min-w-0' },
  imports: [AvatarComponent, ButtonComponent, SettingsRowComponent],
  providers: [WorkConnectionsSettingsViewPresenter],
  templateUrl: './WorkAvailableConnectionsView.html',
  styleUrl: './WorkAvailableConnectionsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkAvailableConnectionsView {
  // #region Fields
  /** Actual feature-owned projections and commands. @protected @readonly */
  protected readonly presenter = inject(WorkConnectionsSettingsViewPresenter);
  // #endregion
}
