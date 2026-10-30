// #region Imports

import type { ArcadeLeaderboardEntry } from './ArcadeLeaderboardEntry';

// #endregion

/** Persisted results supplied to the consolidated Arcade leaderboard dialog. @public */
export interface IArcadeLeaderboardDialogData {
  readonly entries: readonly ArcadeLeaderboardEntry[];
}
