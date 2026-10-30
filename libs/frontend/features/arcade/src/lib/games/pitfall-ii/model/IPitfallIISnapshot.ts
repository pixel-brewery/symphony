// #region Imports

import type { IPitfallIISoundEvent } from './IPitfallIISoundEvent';
import type { IPitfallIIWorld } from './IPitfallIIWorld';

// #endregion

/** Original-scale coordinates: global sprite-left x and feet y; chambers 160 wide, floors 45 apart. @public */
export interface IPitfallIISnapshot {
  readonly status: 'ready' | 'playing' | 'paused' | 'returning' | 'won';
  readonly score: number;
  readonly elapsed: number;
  readonly totalFrames: number;
  readonly displayFrames: number;
  readonly frame: number;
  readonly chamber: number;
  readonly level: number;
  readonly goldCollected: number;
  readonly totalGold: number;
  readonly objectives: {
    readonly rhonda: boolean;
    readonly quickclaw: boolean;
    readonly diamond: boolean;
    readonly rat: boolean;
  };
  readonly camera: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly player: {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
    readonly facing: -1 | 1;
    readonly pose: 'idle' | 'run' | 'jump' | 'climb' | 'swim' | 'balloon' | 'hurt' | 'celebrate';
    readonly animationFrame: number;
    readonly invulnerable: boolean;
  };
  readonly platforms: IPitfallIIWorld['platforms'];
  readonly walls: IPitfallIIWorld['walls'];
  readonly ladders: IPitfallIIWorld['ladders'];
  readonly water: IPitfallIIWorld['water'];
  readonly checkpoints: IPitfallIIWorld['checkpoints'];
  readonly checkpointId: number;
  readonly items: readonly (IPitfallIIWorld['items'][number] & { readonly collected: boolean })[];
  readonly hazards: readonly (IPitfallIIWorld['hazards'][number] & {
    readonly facing: -1 | 1;
    readonly frame: number;
  })[];
  readonly balloon: {
    readonly visible: boolean;
    readonly x: number;
    readonly y: number;
    readonly attached: boolean;
  };
  readonly soundEvents: readonly IPitfallIISoundEvent[];
  readonly music: 'adventure' | 'reward' | 'return' | 'balloon' | 'victory';
}
