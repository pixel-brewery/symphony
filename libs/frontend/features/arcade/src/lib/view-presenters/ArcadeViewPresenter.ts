// #region Imports

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { ArcadeLeaderboardDialogView } from '../leaderboard/ArcadeLeaderboardDialogView';
import { ArcadeLeaderboardStore } from '../leaderboard/ArcadeLeaderboardStore';

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

  /** Shared result history used by the leaderboard tile count. @public @readonly */
  public readonly leaderboardEntries: ArcadeLeaderboardStore['entries'];

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
