// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellComponent,
  CellGroupComponent,
  DividerComponent,
  KbdComponent,
  TextComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { ArcadeSettingsCardViewPresenter } from './ArcadeSettingsCardViewPresenter';

// #endregion

/**
 * Renders Arcade's independently registered preference and session-mode settings.
 *
 * @public
 */
@Component({
  selector: 'symphony-arcade-settings-card-view',
  host: { class: 'contents' },
  imports: [
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellComponent,
    CellGroupComponent,
    DividerComponent,
    KbdComponent,
    TextComponent,
    ToggleSwitchComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: ArcadeSettingsCardViewPresenter }],
  templateUrl: './ArcadeSettingsCardView.html',
  styleUrl: './ArcadeSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArcadeSettingsCardView extends View<ArcadeSettingsCardViewPresenter> {}
