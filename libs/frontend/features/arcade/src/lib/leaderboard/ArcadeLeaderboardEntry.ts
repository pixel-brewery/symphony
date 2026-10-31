// #region Imports

import type { BoxingContenderId } from '../games/realsports-boxing/model/BoxingContenderId';

// #endregion

/** A validated, persisted result from one completed Arcade session. @public */
export type ArcadeLeaderboardEntry =
  | {
      readonly id: string;
      readonly game: 'jungle-hunt';
      readonly completedAt: string;
      readonly score: number;
      readonly level: number;
      readonly player: 1 | 2;
      readonly elapsedSeconds: number;
      readonly outcome: 'lost' | 'completed';
    }
  | {
      readonly id: string;
      readonly game: 'seaquest';
      readonly completedAt: string;
      readonly score: number;
      readonly level: number;
      readonly player: 1 | 2;
      readonly elapsedSeconds: number;
      readonly outcome: 'lost' | 'completed';
    }
  | {
      readonly id: string;
      readonly game: 'river-raid';
      readonly completedAt: string;
      readonly score: number;
      readonly level: number;
      readonly player: 1 | 2;
      readonly elapsedSeconds: number;
      readonly outcome: 'lost' | 'completed';
    }
  | {
      readonly id: string;
      readonly game: 'pong';
      readonly completedAt: string;
      readonly scores: readonly [number, number];
      readonly targetScore: 11 | 15;
      readonly winner: 0 | 1;
      readonly elapsedSeconds: number;
      readonly opponent: 'human';
    }
  | {
      readonly id: string;
      readonly game: 'pitfall';
      readonly completedAt: string;
      readonly score: number;
      readonly treasures: number;
      readonly elapsedSeconds: number;
      readonly outcome: 'completed' | 'lost';
    }
  | {
      readonly id: string;
      readonly game: 'pitfall-ii';
      readonly completedAt: string;
      readonly score: number;
      readonly goldCollected: number;
      readonly elapsedSeconds: number;
      readonly outcome: 'completed';
    }
  | {
      readonly id: string;
      readonly game: 'breakout';
      readonly completedAt: string;
      readonly variation: number;
      readonly winner: number | 'tie' | null;
      readonly teams: readonly {
        readonly index: number;
        readonly players: readonly number[];
        readonly score: number;
        readonly ballsRemaining: number;
        readonly wallsCleared: number;
        readonly elapsedSeconds: number;
      }[];
    }
  | {
      readonly id: string;
      readonly game: 'realsports-boxing';
      readonly completedAt: string;
      readonly players: 1 | 2;
      readonly difficulty: 'A' | 'B';
      readonly contenders: readonly [BoxingContenderId, BoxingContenderId];
      readonly winner: 0 | 1 | null;
      readonly reason: 'knockout' | 'technical-knockout' | 'decision' | 'draw';
      readonly scores: readonly [number, number];
      readonly round: number;
    };
