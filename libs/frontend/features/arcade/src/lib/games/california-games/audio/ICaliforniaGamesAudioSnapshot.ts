// #region Imports

import type { CaliforniaGamesMusicCue } from './CaliforniaGamesMusicCue';
import type { ICaliforniaGamesSoundEvent } from './ICaliforniaGamesSoundEvent';

// #endregion

/** Minimal immutable simulation projection consumed by the browser audio adapter. @public */
export interface ICaliforniaGamesAudioSnapshot {
  /** Active soundtrack program. @public */
  readonly music: CaliforniaGamesMusicCue;
  /** Monotonic program change identifier, including restarts of the same cue. @public */
  readonly musicId: number;
  /** Effects emitted since the current game was created. @public */
  readonly soundEvents: readonly ICaliforniaGamesSoundEvent[];
  /** Whether the deterministic simulation is currently advancing. @public */
  readonly status: 'running' | 'paused';
}
