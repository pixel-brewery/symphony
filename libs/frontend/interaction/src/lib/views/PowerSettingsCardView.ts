// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DotComponent, SkeletonComponent } from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { KeepAwakeDetailsPipe } from '../pipes/KeepAwakeDetailsPipe';
import { KeepAwakeStatusLabelPipe } from '../pipes/KeepAwakeStatusLabelPipe';
import { PowerSettingsCardViewPresenter } from '../view-presenters/PowerSettingsCardViewPresenter';
import { KeepAwakeToggleView } from './KeepAwakeToggleView';

// #endregion

/**
 * System › `Sleep`, owned by the desktop interaction capability.
 *
 * @public
 */
@Component({
  selector: 'symphony-power-settings-card',
  host: { class: 'flex min-w-0 flex-col' },
  imports: [
    DotComponent,
    KeepAwakeDetailsPipe,
    KeepAwakeStatusLabelPipe,
    KeepAwakeToggleView,
    SettingsGroupComponent,
    SettingsRowComponent,
    SkeletonComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: PowerSettingsCardViewPresenter }],
  templateUrl: './PowerSettingsCardView.html',
  styleUrl: './PowerSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PowerSettingsCardView extends View<PowerSettingsCardViewPresenter> {}
