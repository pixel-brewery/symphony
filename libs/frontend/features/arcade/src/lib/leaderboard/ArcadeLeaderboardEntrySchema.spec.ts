// #region Imports

import { describe, expect, it } from 'vitest';
import { ArcadeLeaderboardEntrySchema } from './ArcadeLeaderboardEntrySchema';

// #endregion

const completedExpedition = {
  id: 'pitfall-ii-complete',
  game: 'pitfall-ii',
  completedAt: '2026-09-18T16:00:00.000Z',
  score: 199000,
  goldCollected: 28,
  elapsedSeconds: 2100,
  outcome: 'completed',
};

describe('ArcadeLeaderboardEntrySchema', () => {
  it.each(['jungle-hunt', 'seaquest', 'river-raid'])('accepts a finished %s expedition', (game) => {
    // arrange
    const entry = {
      id: game,
      game,
      completedAt: completedExpedition.completedAt,
      score: 32000,
      level: 8,
      player: 1,
      elapsedSeconds: 480,
      outcome: 'lost',
    };

    // act
    const parsed = ArcadeLeaderboardEntrySchema.safeParse(entry);

    // assert
    expect(parsed.success).toBe(true);
  });

  it.each([
    { game: 'jungle-hunt', player: 2 },
    { game: 'seaquest', score: -1 },
    { game: 'river-raid', level: 0 },
    { game: 'seaquest', elapsedSeconds: Number.NaN },
    { game: 'river-raid', outcome: 'playing' },
  ])('rejects invalid expedition results: %j', (invalid) => {
    // arrange
    const entry = {
      id: 'invalid',
      completedAt: completedExpedition.completedAt,
      score: 1000,
      level: 1,
      player: 1,
      elapsedSeconds: 30,
      outcome: 'lost',
      ...invalid,
    };

    // act
    const parsed = ArcadeLeaderboardEntrySchema.safeParse(entry);

    // assert
    expect(parsed.success).toBe(false);
  });

  it.each([
    { scores: [11, 8], targetScore: 11, winner: 0, valid: true },
    { scores: [14, 15], targetScore: 15, winner: 1, valid: true },
    { scores: [10, 8], targetScore: 11, winner: 0, valid: false },
    { scores: [11, 8], targetScore: 11, winner: 1, valid: false },
    { scores: [11, 11], targetScore: 11, winner: 0, valid: false },
    { scores: [12, 8], targetScore: 11, winner: 0, valid: false },
  ])(
    'accepts Pong results only when the recorded winner reached the configured goal: %j',
    ({ valid, ...result }) => {
      // arrange
      const entry = {
        id: 'pong-match',
        game: 'pong',
        completedAt: completedExpedition.completedAt,
        elapsedSeconds: 180,
        opponent: 'human',
        ...result,
      };

      // act
      const parsed = ArcadeLeaderboardEntrySchema.safeParse(entry);

      // assert
      expect(parsed.success).toBe(valid);
    },
  );

  it('accepts the original Lost Caverns maximum score and completed runs longer than twenty minutes', () => {
    // arrange
    const entry = completedExpedition;

    // act
    const parsed = ArcadeLeaderboardEntrySchema.safeParse(entry);

    // assert
    expect(parsed.success).toBe(true);
  });

  it.each([
    { score: 199001 },
    { score: -1 },
    { goldCollected: 29 },
    { goldCollected: 1.5 },
    { elapsedSeconds: Number.POSITIVE_INFINITY },
    { elapsedSeconds: -1 },
    { outcome: 'lost' },
  ])('rejects impossible or unfinished Lost Caverns results: %j', (invalid) => {
    // arrange
    const entry = { ...completedExpedition, ...invalid };

    // act
    const parsed = ArcadeLeaderboardEntrySchema.safeParse(entry);

    // assert
    expect(parsed.success).toBe(false);
  });
});
