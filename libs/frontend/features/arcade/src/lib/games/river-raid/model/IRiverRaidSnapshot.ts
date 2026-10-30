// #region Imports

import type { IRiverRaidActor } from './IRiverRaidActor';
import type { IRiverRaidBlock } from './IRiverRaidBlock';
import type { IRiverRaidOptions } from './IRiverRaidOptions';
import type { IRiverRaidResult } from './IRiverRaidResult';

// #endregion

/** Immutable simulation projection shared by rendering, controls, audio and results. @public */
export interface IRiverRaidSnapshot {
  readonly status: 'ready' | 'playing' | 'crashed' | 'paused' | 'ended';
  readonly options: IRiverRaidOptions;
  readonly frame: number;
  readonly player: 1 | 2;
  readonly score: number;
  readonly scores: readonly number[];
  readonly reserves: number;
  readonly level: number;
  readonly checkpoint: number;
  readonly fuel: number;
  readonly speed: number;
  readonly x: number;
  readonly bank: -1 | 0 | 1;
  readonly bottom: number;
  readonly missile: { readonly x: number; readonly y: number } | null;
  readonly actors: readonly IRiverRaidActor[];
  readonly blocks: readonly IRiverRaidBlock[];
  readonly refueling: boolean;
  readonly flash: number;
  readonly elapsed: number;
  readonly results: readonly IRiverRaidResult[];
  readonly audioFrames: readonly {
    readonly frame: number;
    readonly channels: readonly (readonly [number, number, number])[];
  }[];
  readonly sounds: readonly (readonly [number, number, number])[];
}
