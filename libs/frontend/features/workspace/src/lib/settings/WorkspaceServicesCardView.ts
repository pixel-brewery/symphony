// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ViewSlotOutletComponent } from '@pixel-brewery/mosaik-elements-angular';
import {
  SettingsGroupComponent,
  SettingsSelectionDirective,
  SettingsViewSlot,
} from '@symphony/frontend-setting';
import { WorkspaceServicesViewPresenter } from './WorkspaceServicesViewPresenter';

// #endregion

/**
 * The workspace's `Connected services` section: boards, configured accounts, feedback intake and
 * the services that can still be connected, each group contributed by its owning feature.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-services-card-view',
  host: { class: 'block' },
  imports: [SettingsGroupComponent, SettingsSelectionDirective, ViewSlotOutletComponent],
  providers: [WorkspaceServicesViewPresenter],
  templateUrl: './WorkspaceServicesCardView.html',
  styleUrl: './WorkspaceServicesCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceServicesCardView {
  // #region Fields

  /** Feature-owned workspace selection and ordered account projection. @protected @readonly */
  protected readonly presenter = inject(WorkspaceServicesViewPresenter);
  /** Existing Mosaik slot identifiers, shared without any business component dependency. @protected @readonly */
  protected readonly slots = SettingsViewSlot;

  // #endregion
}
