// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  CellComponent,
  TextComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { ConnectionIconPipe } from '@symphony/frontend-ui';
import { WorkConnectionsSettingsViewPresenter } from './WorkConnectionsSettingsViewPresenter';
// #endregion
/** Contents-only feature contribution to the existing Services card. @public */
@Component({
  selector: 'symphony-work-connection-settings-view',
  host: { class: 'contents' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    CellComponent,
    TextComponent,
    ConnectionIconPipe,
    IconNameDirective,
  ],
  providers: [WorkConnectionsSettingsViewPresenter],
  templateUrl: './WorkConnectionSettingsView.html',
  styleUrl: './WorkConnectionSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkConnectionSettingsView {
  // #region Fields
  /** Actual feature-owned projections and commands. @protected @readonly */
  protected readonly presenter = inject(WorkConnectionsSettingsViewPresenter);
  // #endregion
}
