// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  CardComponent,
  ImageComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER, WindowToolbarDirective } from '@symphony/frontend-core';
import { ArcadeViewPresenter } from '../view-presenters/ArcadeViewPresenter';

// #endregion

/**
 * Presents the shipped games as cards with cover, player count and `Play`, and `Leaderboard` in
 * the window toolbar, without starting a game.
 *
 * @public
 */
@Component({
  selector: 'symphony-arcade-view',
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    ButtonComponent,
    CardComponent,
    ImageComponent,
    TextComponent,
    TypographyDirective,
    WindowToolbarDirective,
  ],
  providers: [ArcadeViewPresenter, { provide: VIEW_PRESENTER, useExisting: ArcadeViewPresenter }],
  templateUrl: './ArcadeView.html',
  styleUrl: './ArcadeView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArcadeView extends View<ArcadeViewPresenter> {}
