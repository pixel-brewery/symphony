// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellGroupComponent,
  DividerComponent,
  ViewSlotOutletComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { SettingsSelectionDirective, SettingsViewSlot } from '@symphony/frontend-setting';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { WorkspaceServicesViewPresenter } from './WorkspaceServicesViewPresenter';

// #endregion

/** Keeps the original workspace card and group geometry around native feature fragments. @public */
@Component({
  selector: 'symphony-workspace-services-card-view',
  host: { class: 'block' },
  imports: [
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellGroupComponent,
    DividerComponent,
    HeadlineComponent,
    SettingsSelectionDirective,
    ViewSlotOutletComponent,
  ],
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
