// #region Imports

import type { CaliforniaGamesEvent } from './CaliforniaGamesEvent';
import type { ICaliforniaGamesSoundEvent } from './ICaliforniaGamesSoundEvent';

// #endregion

/** Immutable 160 by 102 Lynx frame state shared by View, raster, and sound. @public */
export interface ICaliforniaGamesSnapshot {
  readonly status: 'running' | 'paused';
  readonly phase:
    'intro' | 'title' | 'menu' | 'countdown' | 'playing' | 'event-over' | 'high-scores';
  readonly frame: number;
  readonly players: 1 | 2;
  readonly selectedEvent: CaliforniaGamesEvent;
  readonly currentEvent: CaliforniaGamesEvent | null;
  readonly flipped: boolean;
  readonly godMode: boolean;
  readonly countdown: number;
  readonly music: 'title' | 'high-scores' | 'bmx' | 'surfing' | 'half-pipe' | 'foot-bag' | 'silent';
  readonly musicId: number;
  readonly resultId: number;
  readonly latestResults: readonly {
    readonly player: 1 | 2;
    readonly event: CaliforniaGamesEvent;
    readonly score: number;
  }[];
  readonly highScores: readonly {
    readonly event: CaliforniaGamesEvent;
    readonly entries: readonly {
      readonly player: 1 | 2;
      readonly score: number;
    }[];
  }[];
  readonly newHighScorePlayers: readonly (1 | 2)[];
  readonly eventState:
    | {
        readonly kind: 'bmx';
        readonly timer: number;
        readonly progress: number;
        readonly trackLength: number;
        readonly obstacles: readonly {
          readonly id: number;
          readonly distance: number;
          readonly lane: number;
          readonly kind: 'ramp' | 'log' | 'puddle' | 'cliff';
        }[];
        readonly riders: readonly {
          readonly player: 1 | 2;
          readonly score: number;
          readonly finished: boolean;
          readonly x: number;
          readonly y: number;
          readonly lane: number;
          readonly progress: number;
          readonly speed: number;
          readonly height: number;
          readonly rotation: number;
          readonly pose: 'ride' | 'air' | 'crash' | 'finish';
          readonly crashes: number;
          readonly finishFrame: number | null;
        }[];
      }
    | {
        readonly kind: 'surfing';
        readonly timer: number;
        readonly wavePhase: number;
        readonly pelicanX: number;
        readonly surfers: readonly {
          readonly player: 1 | 2;
          readonly score: number;
          readonly finished: boolean;
          readonly x: number;
          readonly y: number;
          readonly angle: number;
          readonly speed: number;
          readonly wipeouts: number;
          readonly rideFrames: number;
          readonly tubeFrames: number;
          readonly pose: 'waiting' | 'ride' | 'turn' | 'aerial' | 'wipeout' | 'finish';
        }[];
      }
    | {
        readonly kind: 'half-pipe';
        readonly timer: number;
        readonly cameraScale: number;
        readonly skaters: readonly {
          readonly player: 1 | 2;
          readonly score: number;
          readonly finished: boolean;
          readonly x: number;
          readonly y: number;
          readonly velocity: number;
          readonly rotation: number;
          readonly falls: number;
          readonly handplantFrames: number;
          readonly pose:
            'waiting' | 'skate' | 'kick-turn' | 'aerial' | 'handplant' | 'fall' | 'finish';
        }[];
      }
    | {
        readonly kind: 'foot-bag';
        readonly timer: number;
        readonly seagullX: number;
        readonly playersState: readonly {
          readonly player: 1 | 2;
          readonly score: number;
          readonly finished: boolean;
          readonly x: number;
          readonly bagX: number;
          readonly bagY: number;
          readonly bagVelocityX: number;
          readonly bagVelocityY: number;
          readonly combo: number;
          readonly pose: 'ready' | 'run' | 'jump' | 'kick' | 'head' | 'catch' | 'trip' | 'finish';
          readonly drops: number;
          readonly lastMove:
            | 'kick'
            | 'turn'
            | 'head'
            | 'catch'
            | 'heel-lift'
            | 'seagull'
            | 'trip'
            | 'half-axle'
            | 'full-axle'
            | 'horseshoe'
            | 'jester'
            | 'double-arch'
            | 'doda'
            | null;
        }[];
      }
    | null;
  readonly soundEvents: readonly ICaliforniaGamesSoundEvent[];
}
