// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ButtonComponent,
  MessageComponent,
  NumberBoxComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  SettingsConditionalComponent,
  SettingsGroupComponent,
  SettingsRowComponent,
} from '@symphony/frontend-setting';
import { StorageBreakdownComponent } from '@symphony/frontend-ui';
import { WorkspaceSettingsViewPresenter } from './WorkspaceSettingsViewPresenter';

// #endregion

/**
 * A workspace's `Administration` section: its own storage bar and limit, delivery grouping, and
 * the edit, scope, export and delete actions.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-administration-card',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    MessageComponent,
    NumberBoxComponent,
    SettingsConditionalComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    StorageBreakdownComponent,
    ToggleSwitchComponent,
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
