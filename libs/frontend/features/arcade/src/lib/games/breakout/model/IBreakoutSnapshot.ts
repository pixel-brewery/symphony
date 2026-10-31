// #region Imports

import type { IBreakoutOptions } from './IBreakoutOptions';
import type { BreakoutStatus } from './BreakoutStatus';

// #endregion

/** Immutable match, paddle, brick and ball state in a 160 × 192 playfield. @public */
export interface IBreakoutSnapshot {
  readonly status: BreakoutStatus;
  readonly options: IBreakoutOptions;
  readonly currentTeamIndex: number;
  readonly winner: number | 'tie' | null;
  readonly frame: number;
  readonly ballNumber: number;
  readonly consecutiveHits: number;
  readonly wallVisible: boolean;
  readonly teams: readonly {
    readonly index: number;
    readonly players: readonly number[];
    readonly score: number;
    readonly ballsLost: number;
    readonly ballsRemaining: number;
    readonly wallsCleared: number;
    readonly elapsedSeconds: number;
    readonly finished: boolean;
    readonly brickMask: readonly boolean[];
  }[];
  readonly paddles: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly playerNumber: number;
    readonly region: 'whole' | 'left' | 'right';
  }[];
  readonly ball: {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
    readonly radius: number;
    readonly attachedPaddle: number | null;
  };
  readonly bricks: readonly {
    readonly id: number;
    readonly row: number;
    readonly column: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly alive: boolean;
  }[];
  readonly soundEvents: readonly {
    readonly id: number;
    readonly kind:
      'serve' | 'paddle' | 'wall' | 'brickLow' | 'brickMid' | 'brickHigh' | 'miss' | 'complete';
  }[];
}
