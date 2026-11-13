// #region Imports

import { inject, Injectable } from '@angular/core';
import {
  Cancel,
  DIALOG_REF,
  DIALOG_REF_DATA,
  type IDialogRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import type { ArcadeLeaderboardEntry } from './ArcadeLeaderboardEntry';
import type { IArcadeLeaderboardDialogData } from './IArcadeLeaderboardDialogData';

// #endregion

type PitfallLeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'pitfall' }>;
type PitfallIILeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'pitfall-ii' }>;
type BreakoutLeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'breakout' }>;
type BoxingLeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'realsports-boxing' }>;
type JungleHuntLeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'jungle-hunt' }>;
type PongLeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'pong' }>;
type SeaquestLeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'seaquest' }>;
type RiverRaidLeaderboardEntry = Extract<ArcadeLeaderboardEntry, { game: 'river-raid' }>;

/** Projects the shared result history into independently ranked game sections. @public */
@Injectable()
export class ArcadeLeaderboardDialogViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _data = inject(DIALOG_REF_DATA) as IArcadeLeaderboardDialogData;
  private readonly _dialogRef = inject(DIALOG_REF) as IDialogRef<IArcadeLeaderboardDialogData>;

  /** Ranked Pitfall expeditions. @public @readonly */
  public readonly pitfallEntries = this._data.entries.filter(
    (entry): entry is PitfallLeaderboardEntry => entry.game === 'pitfall',
  );
  /** Ranked completed Lost Caverns expeditions. @public @readonly */
  public readonly pitfallIIEntries = this._data.entries.filter(
    (entry): entry is PitfallIILeaderboardEntry => entry.game === 'pitfall-ii',
  );
  /** Ranked Breakout matches. @public @readonly */
  public readonly breakoutEntries = this._data.entries.filter(
    (entry): entry is BreakoutLeaderboardEntry => entry.game === 'breakout',
  );
  /** Ranked RealSports Boxing matches. @public @readonly */
  public readonly boxingEntries = this._data.entries.filter(
    (entry): entry is BoxingLeaderboardEntry => entry.game === 'realsports-boxing',
  );
  /** Ranked Jungle Hunt results. @public @readonly */
  public readonly jungleHuntEntries = this._data.entries.filter(
    (entry): entry is JungleHuntLeaderboardEntry => entry.game === 'jungle-hunt',
  );
  /** Ranked Pong results. @public @readonly */
  public readonly pongEntries = this._data.entries.filter(
    (entry): entry is PongLeaderboardEntry => entry.game === 'pong',
  );
  /** Ranked Seaquest results. @public @readonly */
  public readonly seaquestEntries = this._data.entries.filter(
    (entry): entry is SeaquestLeaderboardEntry => entry.game === 'seaquest',
  );
  /** Ranked River Raid results. @public @readonly */
  public readonly riverRaidEntries = this._data.entries.filter(
    (entry): entry is RiverRaidLeaderboardEntry => entry.game === 'river-raid',
  );
  /** Closes the read-only leaderboard. @public @readonly */
  public readonly closeCommand = new Command(() => {
    this._dialogRef.close(Cancel.negative());
  });

  // #endregion
}
