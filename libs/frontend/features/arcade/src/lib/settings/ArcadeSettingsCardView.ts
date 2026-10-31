// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KbdComponent } from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { ArcadeEnabledToggleView } from './ArcadeEnabledToggleView';
import { ArcadeSettingsCardViewPresenter } from './ArcadeSettingsCardViewPresenter';

// #endregion

/**
 * Renders Arcade's independently registered preference and session-mode settings.
 *
 * @public
 */
@Component({
  selector: 'symphony-arcade-settings-card-view',
  host: { class: 'flex min-w-0 flex-col' },
  imports: [ArcadeEnabledToggleView, KbdComponent, SettingsGroupComponent, SettingsRowComponent],
  providers: [{ provide: VIEW_PRESENTER, useClass: ArcadeSettingsCardViewPresenter }],
  templateUrl: './ArcadeSettingsCardView.html',
  styleUrl: './ArcadeSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArcadeSettingsCardView extends View<ArcadeSettingsCardViewPresenter> {}
