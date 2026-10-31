// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  CellComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { ConnectionIconPipe } from '@symphony/frontend-ui';
import { AiConnectionsSettingsViewPresenter } from './AiConnectionsSettingsViewPresenter';
// #endregion
/** Contents-only feature contribution to the existing Services card. @public */
@Component({
  selector: 'symphony-ai-available-connections-view',
  host: { class: 'contents' },
  imports: [AvatarComponent, ButtonComponent, CellComponent, ConnectionIconPipe, IconNameDirective],
  providers: [AiConnectionsSettingsViewPresenter],
  templateUrl: './AiAvailableConnectionsView.html',
  styleUrl: './AiAvailableConnectionsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAvailableConnectionsView {
  // #region Fields
  /** Actual feature-owned projections and commands. @protected @readonly */
  protected readonly presenter = inject(AiConnectionsSettingsViewPresenter);
  // #endregion
}
