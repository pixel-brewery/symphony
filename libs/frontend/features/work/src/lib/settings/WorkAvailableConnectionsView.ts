// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  CellComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { WorkConnectionsSettingsViewPresenter } from './WorkConnectionsSettingsViewPresenter';
// #endregion
/** Contents-only feature contribution to the existing Services card. @public */
@Component({
  selector: 'symphony-work-available-connections-view',
  host: { class: 'contents' },
  imports: [AvatarComponent, ButtonComponent, CellComponent, IconNameDirective],
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
