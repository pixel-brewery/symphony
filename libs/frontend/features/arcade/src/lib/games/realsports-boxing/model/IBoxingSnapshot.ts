// #region Imports

import type { IBoxingFighter } from './IBoxingFighter';
import type { IBoxingOptions } from './IBoxingOptions';
import type { IBoxingResult } from './IBoxingResult';
import type { IBoxingSoundEvent } from './IBoxingSoundEvent';

// #endregion

/** Complete immutable boxing simulation frame. @public */
export interface IBoxingSnapshot {
  readonly status: 'demo' | 'ready' | 'fighting' | 'rest' | 'knockdown' | 'celebration' | 'paused';
  readonly options: IBoxingOptions;
  readonly fighters: readonly [IBoxingFighter, IBoxingFighter];
  readonly frame: number;
  readonly round: number;
  readonly secondsRemaining: number;
  readonly intermissionSeconds: number;
  readonly count: number;
  readonly downedPlayer: 0 | 1 | null;
  readonly result: IBoxingResult | null;
  readonly soundEvents: readonly IBoxingSoundEvent[];
}
