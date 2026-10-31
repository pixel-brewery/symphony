// #region Imports

import type { IPongSoundEvent } from './IPongSoundEvent';

// #endregion

/** Immutable state of the two-player 1972 arcade circuit reconstruction. @public */
export interface IPongSnapshot {
  readonly status: 'attract' | 'serving' | 'playing' | 'paused' | 'gameOver';
  readonly generation: number;
  readonly frame: number;
  readonly elapsedSeconds: number;
  readonly scores: readonly [number, number];
  readonly targetScore: 11 | 15;
  readonly winner: 0 | 1 | null;
  readonly paddles: readonly [number, number];
  readonly ball: {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
    readonly visible: boolean;
  };
  readonly rallyHits: number;
  readonly serveFrames: number;
  readonly soundEvents: readonly IPongSoundEvent[];
}
