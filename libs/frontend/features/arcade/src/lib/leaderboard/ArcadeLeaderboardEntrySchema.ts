// #region Imports

import { z } from 'zod';

// #endregion

const completedAt = z.iso.datetime();
const id = z.string().min(1).max(100);
const scoreGameFields = {
  id,
  completedAt,
  score: z.number().int().min(0).max(1000000),
  level: z.number().int().min(1).max(1000000),
  player: z.union([z.literal(1), z.literal(2)]),
  elapsedSeconds: z.number().finite().min(0).max(31536000),
  outcome: z.enum(['lost', 'completed']),
};

/** Validates every persisted Arcade result before it reaches the leaderboard. @public */
export const ArcadeLeaderboardEntrySchema = z.discriminatedUnion('game', [
  z.object({ ...scoreGameFields, game: z.literal('jungle-hunt'), player: z.literal(1) }),
  z.object({ ...scoreGameFields, game: z.literal('seaquest') }),
  z.object({ ...scoreGameFields, game: z.literal('river-raid') }),
  z
    .object({
      id,
      game: z.literal('pong'),
      completedAt,
      scores: z.tuple([z.number().int().min(0).max(15), z.number().int().min(0).max(15)]),
      targetScore: z.union([z.literal(11), z.literal(15)]),
      winner: z.union([z.literal(0), z.literal(1)]),
      elapsedSeconds: z.number().finite().min(0).max(31536000),
      opponent: z.literal('human'),
    })
    .refine(
      (entry) =>
        entry.scores[entry.winner] === entry.targetScore &&
        entry.scores[1 - entry.winner]! < entry.targetScore,
    ),
  z.object({
    id,
    game: z.literal('pitfall'),
    completedAt,
    score: z.number().int().min(0).max(114000),
    treasures: z.number().int().min(0).max(32),
    elapsedSeconds: z.number().finite().min(0).max(1200),
    outcome: z.enum(['completed', 'lost']),
  }),
  z.object({
    id,
    game: z.literal('pitfall-ii'),
    completedAt,
    score: z.number().int().min(0).max(199000),
    goldCollected: z.number().int().min(0).max(28),
    elapsedSeconds: z.number().finite().min(0).max(31536000),
    outcome: z.literal('completed'),
  }),
  z.object({
    id,
    game: z.literal('breakout'),
    completedAt,
    variation: z.number().int().min(1).max(12),
    winner: z.union([z.number().int().min(0).max(1), z.literal('tie'), z.null()]),
    teams: z
      .array(
        z.object({
          index: z.number().int().min(0).max(1),
          players: z.array(z.number().int().min(1).max(4)).min(1).max(2),
          score: z.number().int().min(0).max(864),
          ballsRemaining: z.number().int().min(0).max(5),
          wallsCleared: z.number().int().min(0).max(2),
          elapsedSeconds: z.number().finite().min(0).max(31536000),
        }),
      )
      .min(1)
      .max(2),
  }),
  z.object({
    id,
    game: z.literal('realsports-boxing'),
    completedAt,
    players: z.union([z.literal(1), z.literal(2)]),
    difficulty: z.enum(['A', 'B']),
    contenders: z.tuple([
      z.enum(['iron-fists', 'jabbin-jack', 'lefty-oleary', 'macho-man']),
      z.enum(['iron-fists', 'jabbin-jack', 'lefty-oleary', 'macho-man']),
    ]),
    winner: z.union([z.literal(0), z.literal(1), z.null()]),
    reason: z.enum(['knockout', 'technical-knockout', 'decision', 'draw']),
    scores: z.tuple([z.number().int().min(0).max(10000), z.number().int().min(0).max(10000)]),
    round: z.number().int().min(1).max(7),
  }),
]);
