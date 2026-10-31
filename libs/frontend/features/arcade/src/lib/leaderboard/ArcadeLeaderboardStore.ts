// #region Imports

import { Inject, inject, Injectable, signal } from '@angular/core';
import { BROWSER_STORAGE } from '@symphony/frontend-core';
import type { IPitfallRecord } from '../games/pitfall/records/IPitfallRecord';
import { PitfallRecordSchema } from '../games/pitfall/records/PitfallRecordSchema';
import type { ArcadeLeaderboardEntry } from './ArcadeLeaderboardEntry';
import { ArcadeLeaderboardEntrySchema } from './ArcadeLeaderboardEntrySchema';

// #endregion

const STORAGE_KEY = 'symphony.arcade.leaderboard.v1';
const LEGACY_PITFALL_STORAGE_KEY = 'symphony.arcade.pitfall.records.v1';
const MAX_STORED_VALUE_LENGTH = 100000;
const MAX_ENTRIES_PER_GAME = 10;

/** Owns the validated, ranked result history shared by every Arcade game and its hub. @public */
@Injectable({ providedIn: 'root' })
export class ArcadeLeaderboardStore {
  // #region Fields

  private readonly _storage: Pick<Storage, 'getItem' | 'setItem'> | undefined;
  private readonly _entries = signal<readonly ArcadeLeaderboardEntry[]>([]);

  /** Best ten completed sessions per game, grouped in Arcade order. @public @readonly */
  public readonly entries = this._entries.asReadonly();

  // #endregion

  // #region Ctor

  /** Hydrates all game results and adopts valid entries from the former Pitfall-only table. @public */
  public constructor(
    @Inject(BROWSER_STORAGE)
    storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = inject(BROWSER_STORAGE),
  ) {
    this._storage = storage;
    this._entries.set(this.read());
  }

  // #endregion

  // #region Methods

  /** Adds one completed session and reports whether it could be saved across application restarts. @public */
  public add(entry: ArcadeLeaderboardEntry): boolean {
    if (!ArcadeLeaderboardEntrySchema.safeParse(entry).success) return false;
    this._entries.set(
      this.rank([...this._entries().filter((candidate) => candidate.id !== entry.id), entry]),
    );
    try {
      if (!this._storage) return false;
      this._storage.setItem(STORAGE_KEY, JSON.stringify(this._entries()));
      return true;
    } catch {
      return false;
    }
  }

  private read(): readonly ArcadeLeaderboardEntry[] {
    const entries = this.readEntries(STORAGE_KEY);
    const migrated = this.readLegacyPitfallRecords().map((record): ArcadeLeaderboardEntry => ({
      game: 'pitfall',
      ...record,
    }));
    return this.rank([...entries, ...migrated]);
  }

  private readEntries(key: string): readonly ArcadeLeaderboardEntry[] {
    try {
      const value = this._storage?.getItem(key);
      if (!value || value.length > MAX_STORED_VALUE_LENGTH) return [];
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      const entries: ArcadeLeaderboardEntry[] = [];
      for (const candidate of parsed.slice(0, 100)) {
        const result = ArcadeLeaderboardEntrySchema.safeParse(candidate);
        if (result.success && !entries.some((entry) => entry.id === result.data.id))
          entries.push(result.data);
      }
      return entries;
    } catch {
      return [];
    }
  }

  private readLegacyPitfallRecords(): readonly IPitfallRecord[] {
    try {
      const value = this._storage?.getItem(LEGACY_PITFALL_STORAGE_KEY);
      if (!value || value.length > 20000) return [];
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      const records: IPitfallRecord[] = [];
      for (const candidate of parsed.slice(0, 100)) {
        const result = PitfallRecordSchema.safeParse(candidate);
        if (result.success && !records.some((record) => record.id === result.data.id))
          records.push(result.data);
      }
      return records;
    } catch {
      return [];
    }
  }

  private rank(entries: readonly ArcadeLeaderboardEntry[]): readonly ArcadeLeaderboardEntry[] {
    const unique = entries.filter(
      (entry, index) => entries.findIndex((candidate) => candidate.id === entry.id) === index,
    );
    return (
      [
        'pitfall',
        'pitfall-ii',
        'breakout',
        'realsports-boxing',
        'jungle-hunt',
        'pong',
        'seaquest',
        'river-raid',
      ] as const
    ).flatMap((game) =>
      unique
        .filter((entry) => entry.game === game)
        .sort((left, right) => this.compare(right, left))
        .slice(0, MAX_ENTRIES_PER_GAME),
    );
  }

  private compare(left: ArcadeLeaderboardEntry, right: ArcadeLeaderboardEntry): number {
    const scoreDifference = this.score(left) - this.score(right);
    if (scoreDifference !== 0) return scoreDifference;
    if (left.game === 'pitfall' && right.game === 'pitfall') {
      const treasureDifference = left.treasures - right.treasures;
      if (treasureDifference !== 0) return treasureDifference;
      const elapsedDifference = right.elapsedSeconds - left.elapsedSeconds;
      if (elapsedDifference !== 0) return elapsedDifference;
    }
    if (left.game === 'pitfall-ii' && right.game === 'pitfall-ii') {
      const goldDifference = left.goldCollected - right.goldCollected;
      if (goldDifference !== 0) return goldDifference;
      const elapsedDifference = right.elapsedSeconds - left.elapsedSeconds;
      if (elapsedDifference !== 0) return elapsedDifference;
    }
    if ('level' in left && 'level' in right) {
      const levelDifference = left.level - right.level;
      if (levelDifference !== 0) return levelDifference;
    }
    return left.completedAt.localeCompare(right.completedAt);
  }

  private score(entry: ArcadeLeaderboardEntry): number {
    if ('score' in entry) return entry.score;
    if (entry.game === 'pong') return Math.abs(entry.scores[0] - entry.scores[1]);
    if (entry.game === 'breakout') return Math.max(...entry.teams.map((team) => team.score));
    return Math.max(...entry.scores);
  }

  // #endregion
}
