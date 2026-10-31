// #region Imports

import type { Command } from '@symphony/frontend-core';

// #endregion

/** One shipped game as the Arcade catalog shows it: cover, title, players and its play command. @public */
export interface IArcadeGame {
  /** Stable route segment and test-id suffix, for example `pitfall-ii`. @public @readonly */
  readonly id: string;
  /** Card title. @public @readonly */
  readonly title: string;
  /** Full published title, used for the accessible play label. @public @readonly */
  readonly fullTitle: string;
  /** Packaged cover image path. @public @readonly */
  readonly cover: string;
  /** Fewest players the game accepts. @public @readonly */
  readonly minPlayers: number;
  /** Most players the game accepts. @public @readonly */
  readonly maxPlayers: number;
  /** Opens the game's title screen. @public @readonly */
  readonly play: Command<void>;
}
