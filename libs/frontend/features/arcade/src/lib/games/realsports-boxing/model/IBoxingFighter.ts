// #region Imports

import type { BoxingContenderId } from './BoxingContenderId';

// #endregion

/** One boxer in the 320 × 192 ring, with strength lead separated from remaining endurance. @public */
export interface IBoxingFighter {
  readonly contender: BoxingContenderId;
  readonly x: number;
  readonly y: number;
  readonly facing: -1 | 1;
  readonly strength: number;
  readonly strengthLead: number;
  readonly canKnockDown: boolean;
  readonly score: number;
  readonly roundScore: number;
  readonly unanswered: number;
  readonly knockdowns: number;
  readonly pose:
    'idle' | 'move' | 'jab' | 'body' | 'payoff' | 'cover' | 'hurt' | 'down' | 'celebrate';
  readonly animation: number;
}
