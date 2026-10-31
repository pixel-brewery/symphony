// #region Imports

import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  CellComponent,
  CellGroupComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { CommandDirective, View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { BoxingContenderNamePipe } from '../games/realsports-boxing/views/BoxingContenderNamePipe';
import { ArcadeLeaderboardDialogViewPresenter } from './ArcadeLeaderboardDialogViewPresenter';

// #endregion

/** Read-only, consolidated result dialog opened from the Arcade hub. @public */
@Component({
  selector: 'symphony-arcade-leaderboard-dialog-view',
  imports: [
    BoxingContenderNamePipe,
    ButtonComponent,
    CellComponent,
    CellGroupComponent,
    CommandDirective,
    DatePipe,
    DecimalPipe,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: ArcadeLeaderboardDialogViewPresenter }],
  templateUrl: './ArcadeLeaderboardDialogView.html',
  styleUrl: './ArcadeLeaderboardDialogView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArcadeLeaderboardDialogView extends View<ArcadeLeaderboardDialogViewPresenter> {}
