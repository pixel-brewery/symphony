// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ToggleSwitchComponent } from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { ArcadeEnabledToggleViewPresenter } from './ArcadeEnabledToggleViewPresenter';

// #endregion

/**
 * The `Show Arcade` switch, in Appearance › Navigation and in search results.
 *
 * @public
 */
@Component({
  selector: 'symphony-arcade-enabled-toggle',
  host: { class: 'flex flex-none items-center' },
  imports: [ToggleSwitchComponent],
  providers: [{ provide: VIEW_PRESENTER, useClass: ArcadeEnabledToggleViewPresenter }],
  templateUrl: './ArcadeEnabledToggleView.html',
  styleUrl: './ArcadeEnabledToggleView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArcadeEnabledToggleView extends View<ArcadeEnabledToggleViewPresenter> {}
