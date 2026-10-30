// #region Imports

import type { IPitfallRoom } from './IPitfallRoom';
import type { IPitfallSoundEvent } from './IPitfallSoundEvent';
import type { PitfallStatus } from './PitfallStatus';

// #endregion

/** The immutable state of the expedition, including original pixel coordinates. @public */
export interface IPitfallSnapshot {
  readonly status: PitfallStatus;
  readonly terminalReason: 'treasures' | 'lives' | 'time' | null;
  readonly score: number;
  readonly lives: number;
  readonly treasuresCollected: number;
  readonly totalTreasures: number;
  readonly elapsed: number;
  readonly totalFrames: number;
  readonly displayFrames: number;
  readonly idleFrames: number;
  readonly frame: number;
  readonly timeRemaining: number;
  readonly deathFramesRemaining: number;
  readonly soundEvents: readonly IPitfallSoundEvent[];
  readonly room: IPitfallRoom;
  readonly player: {
    /** Original sprite LEFT x and FEET y, in a 160 × 192 world. */
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
    readonly facing: -1 | 1;
    readonly pose: 'idle' | 'run' | 'jump' | 'swing' | 'climb' | 'hurt';
    readonly animationFrame: number;
    readonly spriteOffsetY: number;
    readonly layer: 'surface' | 'underground';
    readonly invulnerable: boolean;
  };
  readonly vine: {
    readonly anchorX: number;
    readonly anchorY: number;
    readonly x: number;
    readonly y: number;
    readonly attached: boolean;
    readonly slope: number;
    readonly direction: -1 | 1;
  } | null;
}
