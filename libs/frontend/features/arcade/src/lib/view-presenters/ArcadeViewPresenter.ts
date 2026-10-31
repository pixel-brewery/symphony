// #region Imports

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { ArcadeLeaderboardDialogView } from '../leaderboard/ArcadeLeaderboardDialogView';
import { ArcadeLeaderboardStore } from '../leaderboard/ArcadeLeaderboardStore';
import type { IArcadeGame } from './IArcadeGame';

// #endregion

/** Owns game navigation and the consolidated leaderboard dialog for the Arcade catalog. @public */
@Injectable()
export class ArcadeViewPresenter extends ViewPresenter {
  // #region Fields

  /** Opens the Pitfall title screen before an expedition starts. @public */
  public readonly playPitfallCommand: Command<void>;

  /** Opens the Pitfall II title screen before entering the Lost Caverns. @public */
  public readonly playPitfallIICommand: Command<void>;

  /** Opens the Breakout title screen. @public */
  public readonly playBreakoutCommand: Command<void>;

  /** Opens the RealSports Boxing title screen. @public */
  public readonly playRealSportsBoxingCommand: Command<void>;

  /** Opens the Jungle Hunt title screen. @public */
  public readonly playJungleHuntCommand: Command<void>;

  /** Opens the original arcade Pong title screen. @public */
  public readonly playPongCommand: Command<void>;

  /** Opens the Seaquest title screen. @public */
  public readonly playSeaquestCommand: Command<void>;

  /** Opens the River Raid title screen. @public */
  public readonly playRiverRaidCommand: Command<void>;

  /** Opens every game's ranked completed results from the Arcade hub. @public */
  public readonly showLeaderboardCommand: Command<void>;

  /** Shared result history shown by the leaderboard dialog. @public @readonly */
  public readonly leaderboardEntries: ArcadeLeaderboardStore['entries'];

  /**
   * The shipped games in catalog order, each with the player counts its own setup offers.
   *
   * @public
   * @readonly
   */
  public readonly games: readonly IArcadeGame[];

  // #endregion

  // #region Ctor

  /** Connects each catalog action to its owning route or dialog. @public */
  public constructor(
    router: Router,
    leaderboard: ArcadeLeaderboardStore,
    dialogService: DialogService,
  ) {
    super();
    this.leaderboardEntries = leaderboard.entries;
    this.playPitfallCommand = new Command(() => {
      void router.navigate(['/main/arcade/pitfall']);
    });
    this.playPitfallIICommand = new Command(() => {
      void router.navigate(['/main/arcade/pitfall-ii']);
    });
    this.playBreakoutCommand = new Command(() => {
      void router.navigate(['/main/arcade/breakout']);
    });
    this.playRealSportsBoxingCommand = new Command(() => {
      void router.navigate(['/main/arcade/realsports-boxing']);
    });
    this.playJungleHuntCommand = new Command(() => {
      void router.navigate(['/main/arcade/jungle-hunt']);
    });
    this.playPongCommand = new Command(() => {
      void router.navigate(['/main/arcade/pong']);
    });
    this.playSeaquestCommand = new Command(() => {
      void router.navigate(['/main/arcade/seaquest']);
    });
    this.playRiverRaidCommand = new Command(() => {
      void router.navigate(['/main/arcade/river-raid']);
    });
    this.games = [
      game('pong', 'Pong', 'Pong', 2, 2, this.playPongCommand),
      game('breakout', 'Breakout', 'Breakout', 1, 4, this.playBreakoutCommand),
      game('pitfall', 'Pitfall!', 'Pitfall!', 1, 1, this.playPitfallCommand),
      game('pitfall-ii', 'Pitfall II', 'Pitfall II: Lost Caverns', 1, 1, this.playPitfallIICommand),
      game('river-raid', 'River Raid', 'River Raid', 1, 2, this.playRiverRaidCommand),
      game('seaquest', 'Seaquest', 'Seaquest', 1, 2, this.playSeaquestCommand),
      game('jungle-hunt', 'Jungle Hunt', 'Jungle Hunt', 1, 1, this.playJungleHuntCommand),
      game(
        'realsports-boxing',
        'RealSports Boxing',
        'RealSports Boxing',
        1,
        2,
        this.playRealSportsBoxingCommand,
      ),
    ];
    this.showLeaderboardCommand = new Command(() => {
      dialogService.show(ArcadeLeaderboardDialogView, {
        data: { entries: leaderboard.entries() },
        hasBackdrop: true,
        backdropStrategy: 'own',
        clickOutsideToClose: true,
        pressEscapeToClose: true,
        size: { width: '52rem', height: '90dvh' },
        minSize: { width: '20rem' },
        maxSize: { width: '100vw', height: '100dvh' },
      });
    });
  }

  // #endregion
}

function game(
  id: string,
  title: string,
  fullTitle: string,
  minPlayers: number,
  maxPlayers: number,
  play: Command<void>,
): IArcadeGame {
  return { id, title, fullTitle, cover: `arcade/${id}.webp`, minPlayers, maxPlayers, play };
}
