// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  CellComponent,
  CellGroupComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { WorkConnectionsSettingsViewPresenter } from './WorkConnectionsSettingsViewPresenter';
// #endregion
/** Contents-only feature contribution to the existing Services card. @public */
@Component({
  selector: 'symphony-work-boards-settings-view',
  host: { class: 'contents' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    CellComponent,
    CellGroupComponent,
    HeadlineComponent,
    IconNameDirective,
  ],
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
