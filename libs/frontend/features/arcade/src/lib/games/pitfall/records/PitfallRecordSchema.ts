// #region Imports

import { z } from 'zod';

// #endregion

/** Validates legacy Pitfall records before leaderboard migration. @public */
export const PitfallRecordSchema = z.object({
  id: z.string().min(1).max(100),
  score: z.number().int().min(0).max(114000),
  treasures: z.number().int().min(0).max(32),
  elapsedSeconds: z.number().finite().min(0).max(1200),
  completedAt: z.iso.datetime(),
  outcome: z.enum(['completed', 'lost']),
});
