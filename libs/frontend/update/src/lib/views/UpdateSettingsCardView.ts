// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  SelectComponent,
  SelectItemComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { UpdateDetailsPipe } from '../pipes/UpdateDetailsPipe';
import { UpdateStatusLabelPipe } from '../pipes/UpdateStatusLabelPipe';
import { UpdateSettingsCardViewPresenter } from '../view-presenters/UpdateSettingsCardViewPresenter';

// #endregion

/**
 * System › `Updates`: the installed version, `Check for updates` and the release channel; download
 * and restart live in the main window's status bar.
 *
 * @public
 */
@Component({
  selector: 'symphony-update-settings-card',
  host: { class: 'flex min-w-0 flex-col' },
  imports: [
    ButtonComponent,
    SelectComponent,
    SelectItemComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    UpdateDetailsPipe,
    UpdateStatusLabelPipe,
  ],
  providers: [
    UpdateSettingsCardViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: UpdateSettingsCardViewPresenter },
  ],
  templateUrl: './UpdateSettingsCardView.html',
  styleUrl: './UpdateSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateSettingsCardView extends View<UpdateSettingsCardViewPresenter> {}
