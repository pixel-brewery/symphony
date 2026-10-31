// #region Imports

import type { IJungleHuntOptions } from './IJungleHuntOptions';
import type { IJungleHuntSoundEvent } from './IJungleHuntSoundEvent';

// #endregion

/** Immutable 160 by 192 NTSC playfield state, shared by the View, raster and sound. @public */
export interface IJungleHuntSnapshot {
  readonly status: 'ready' | 'playing' | 'paused' | 'dying' | 'transition' | 'rescued' | 'gameOver';
  readonly stage: 'vines' | 'river' | 'boulders' | 'rescue';
  readonly options: IJungleHuntOptions;
  readonly frame: number;
  readonly elapsed: number;
  readonly score: number;
  readonly lives: number;
  readonly timer: number;
  readonly timerValue: number;
  readonly air: number;
  readonly level: number;
  readonly rescues: number;
  readonly godMode: boolean;
  readonly outcome: 'lost' | 'completed' | null;
  readonly cameraX: number;
  readonly progress: number;
  readonly player: {
    readonly x: number;
    readonly y: number;
    readonly velocityY: number;
    readonly facing: -1 | 1;
    readonly pose: 'swing' | 'jump' | 'swim' | 'knife' | 'run' | 'duck' | 'dead' | 'celebrate';
    readonly vine: number | null;
    readonly knifeFrames: number;
  };
  readonly vines: readonly {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly tipX: number;
    readonly tipY: number;
  }[];
  readonly crocodiles: readonly {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly mouth: 0 | 1 | 2;
    readonly rogue: boolean;
    readonly alive: boolean;
  }[];
  readonly boulders: readonly {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly passed: boolean;
  }[];
  readonly guards: readonly {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly spearY: number;
    readonly passed: boolean;
  }[];
  readonly soundEvents: readonly IJungleHuntSoundEvent[];
}
