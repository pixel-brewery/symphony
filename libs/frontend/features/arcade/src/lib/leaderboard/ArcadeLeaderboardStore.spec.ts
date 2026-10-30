// #region Imports

import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import type { ArcadeLeaderboardEntry } from './ArcadeLeaderboardEntry';
import { ArcadeLeaderboardStore } from './ArcadeLeaderboardStore';

// #endregion

vi.mock('@symphony/frontend-core', () => ({ BROWSER_STORAGE: Symbol('BROWSER_STORAGE') }));

const pitfall = (id: string, score: number, elapsedSeconds = 100): ArcadeLeaderboardEntry => ({
  id,
  game: 'pitfall',
  score,
  elapsedSeconds,
  treasures: 1,
  completedAt: '2026-09-05T16:00:00.000Z',
  outcome: 'lost',
});

const pitfallII = (
  id: string,
  score: number,
  goldCollected = 1,
  elapsedSeconds = 100,
): ArcadeLeaderboardEntry => ({
  id,
  game: 'pitfall-ii',
  score,
  goldCollected,
  elapsedSeconds,
  completedAt: '2026-09-18T16:00:00.000Z',
  outcome: 'completed',
});

describe('ArcadeLeaderboardStore', () => {
  it('persists and ranks ten completed sessions independently for every game', () => {
    // arrange
    let stored = '';
    const storage = {
      getItem: (key: string) => (key === 'symphony.arcade.leaderboard.v1' ? stored : null),
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    };
    const leaderboard = new ArcadeLeaderboardStore(storage);

    // act
    for (let index = 0; index < 12; index++) {
      leaderboard.add(pitfall(`pitfall-${index}`, index * 1000));
      leaderboard.add(pitfallII(`pitfall-ii-${index}`, index * 5000));
      for (const game of ['jungle-hunt', 'seaquest', 'river-raid'] as const) {
        leaderboard.add({
          id: `${game}-${index}`,
          game,
          completedAt: '2026-09-18T16:00:00.000Z',
          score: index * 1000,
          level: index + 1,
          player: 1,
          elapsedSeconds: 100,
          outcome: 'lost',
        });
      }
      leaderboard.add({
        id: `pong-${index}`,
        game: 'pong',
        completedAt: '2026-09-18T16:00:00.000Z',
        scores: [15, index],
        targetScore: 15,
        winner: 0,
        elapsedSeconds: 100,
        opponent: 'human',
      });
    }
    leaderboard.add({
      id: 'breakout-1',
      game: 'breakout',
      completedAt: '2026-09-06T16:00:00.000Z',
      variation: 1,
      winner: 0,
      teams: [
        {
          index: 0,
          players: [1],
          score: 432,
          ballsRemaining: 2,
          wallsCleared: 1,
          elapsedSeconds: 80,
        },
      ],
    });
    leaderboard.add({
      id: 'boxing-1',
      game: 'realsports-boxing',
      completedAt: '2026-09-07T16:00:00.000Z',
      players: 1,
      difficulty: 'B',
      contenders: ['iron-fists', 'jabbin-jack'],
      winner: 0,
      reason: 'knockout',
      scores: [24, 8],
      round: 2,
    });
    const reopened = new ArcadeLeaderboardStore(storage);

    // assert
    expect(reopened.entries().filter((entry) => entry.game === 'pitfall')).toHaveLength(10);
    expect(reopened.entries().filter((entry) => entry.game === 'pitfall-ii')).toHaveLength(10);
    expect(reopened.entries().map((entry) => entry.game)).toContain('breakout');
    expect(reopened.entries().map((entry) => entry.game)).toContain('realsports-boxing');
    expect(reopened.entries()[0]).toMatchObject({ id: 'pitfall-11', score: 11000 });
    expect(reopened.entries()[10]).toMatchObject({ id: 'pitfall-ii-11', score: 55000 });
    for (const game of ['jungle-hunt', 'seaquest', 'river-raid'] as const) {
      const results = reopened.entries().filter((entry) => entry.game === game);
      expect(results).toHaveLength(10);
      expect(results[0]).toMatchObject({ id: `${game}-11`, score: 11000 });
    }
    const pongResults = reopened.entries().filter((entry) => entry.game === 'pong');
    expect(pongResults).toHaveLength(10);
    expect(pongResults[0]).toMatchObject({ id: 'pong-0', scores: [15, 0] });
    expect(reopened.entries()).toHaveLength(62);
  });

  it('keeps alternating players independent and replaces a repeated completion instead of duplicating it', () => {
    // arrange
    const leaderboard = new ArcadeLeaderboardStore({
      getItem: () => null,
      setItem: () => undefined,
    });
    const first: ArcadeLeaderboardEntry = {
      id: 'river-player-1',
      game: 'river-raid',
      completedAt: '2026-09-18T16:00:00.000Z',
      score: 15000,
      level: 4,
      player: 1,
      elapsedSeconds: 120,
      outcome: 'lost',
    };
    const second: ArcadeLeaderboardEntry = { ...first, id: 'river-player-2', player: 2, level: 5 };

    // act
    leaderboard.add(first);
    leaderboard.add(second);
    leaderboard.add(second);

    // assert
    expect(leaderboard.entries()).toEqual([second, first]);
  });

  it('ranks completed Lost Caverns expeditions by score, gold and then shortest elapsed time', () => {
    // arrange
    const leaderboard = new ArcadeLeaderboardStore({
      getItem: () => null,
      setItem: () => undefined,
    });

    // act
    leaderboard.add(pitfallII('less-gold', 150000, 20, 80));
    leaderboard.add(pitfallII('more-gold-slower', 150000, 21, 100));
    leaderboard.add(pitfallII('more-gold-faster', 150000, 21, 90));
    leaderboard.add(pitfallII('highest-score', 199000, 28, 200));

    // assert
    expect(leaderboard.entries().map((entry) => entry.id)).toEqual([
      'highest-score',
      'more-gold-faster',
      'more-gold-slower',
      'less-gold',
    ]);
  });

  it('migrates valid Pitfall records and ignores corrupt persisted results', () => {
    // arrange
    const legacy = JSON.stringify([
      pitfall('legacy', 8000),
      { ...pitfall('bad', 1), score: 200000 },
    ]);
    const storage = {
      getItem: (key: string) => {
        if (key === 'symphony.arcade.leaderboard.v1') return 'invalid json';
        if (key === 'symphony.arcade.pitfall.records.v1')
          return legacy.replaceAll('"game":"pitfall",', '');
        return null;
      },
      setItem: () => undefined,
    };

    // act
    const leaderboard = new ArcadeLeaderboardStore(storage);

    // assert
    expect(leaderboard.entries()).toEqual([pitfall('legacy', 8000)]);
  });

  it('retains a valid result for the current session when storage is unavailable', () => {
    // arrange
    const leaderboard = new ArcadeLeaderboardStore({
      getItem: () => {
        throw new Error('Unavailable');
      },
      setItem: () => {
        throw new Error('Full');
      },
    });

    // act
    const saved = leaderboard.add(pitfall('one-run', 4000));

    // assert
    expect(saved).toBe(false);
    expect(leaderboard.entries()).toEqual([pitfall('one-run', 4000)]);
  });
});
