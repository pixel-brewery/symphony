// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { CiSettingsViewPresenter } from '../CiSettingsViewPresenter';
import { WorkspaceLocalCiCardView } from './WorkspaceLocalCiCardView';

// #endregion

/** Hosts the existing workspace-local-CI card with its owning Settings selection. @public */
@Component({
  selector: 'symphony-workspace-local-ci-settings',
  host: { class: 'block' },
  imports: [WorkspaceLocalCiCardView],
  providers: [
    CiSettingsViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: CiSettingsViewPresenter },
  ],
  templateUrl: './WorkspaceLocalCiSettingsView.html',
  styleUrl: './WorkspaceLocalCiSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLocalCiSettingsView extends View<CiSettingsViewPresenter> {}
