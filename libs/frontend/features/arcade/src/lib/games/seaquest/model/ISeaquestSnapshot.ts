// #region Imports

import type { ISeaquestOptions } from './ISeaquestOptions';
import type { ISeaquestSoundEvent } from './ISeaquestSoundEvent';

// #endregion

/** Immutable NTSC frame; submarine y uses the cartridge's 13–108 range. @public */
export interface ISeaquestSnapshot {
  readonly status:
    | 'ready'
    | 'playing'
    | 'paused'
    | 'dying'
    | 'oxygen-bonus'
    | 'diver-bonus'
    | 'refilling'
    | 'gameOver'
    | 'completed';
  readonly options: ISeaquestOptions;
  readonly frame: number;
  readonly currentPlayer: 1 | 2;
  readonly score: number;
  readonly level: number;
  readonly difficulty: number;
  readonly divers: number;
  readonly oxygen: number;
  readonly reserves: number;
  readonly elapsedSeconds: number;
  readonly player: {
    readonly x: number;
    readonly y: number;
    readonly facing: -1 | 1;
    readonly animation: number;
    readonly deathFrame: number;
  };
  readonly torpedo: { readonly x: number; readonly y: number; readonly direction: -1 | 1 } | null;
  readonly patrol: { readonly x: number; readonly active: boolean };
  readonly rows: readonly {
    readonly lane: number;
    readonly y: number;
    readonly kind: 'shark' | 'sub';
    readonly direction: -1 | 1;
    readonly positions: readonly number[];
    readonly diver: number | null;
    readonly torpedo: number | null;
    readonly caughtDiver: boolean;
  }[];
  readonly players: readonly {
    readonly player: 1 | 2;
    readonly score: number;
    readonly level: number;
    readonly reserves: number;
    readonly divers: number;
    readonly elapsedSeconds: number;
    readonly outcome: 'lost' | 'completed' | null;
  }[];
  readonly soundEvents: readonly ISeaquestSoundEvent[];
}
