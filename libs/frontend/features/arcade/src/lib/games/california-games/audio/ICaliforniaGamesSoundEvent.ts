/** Ordered audio cue emitted by the deterministic California Games simulation. @public */
export interface ICaliforniaGamesSoundEvent {
  /** Monotonically increasing identifier used to prevent duplicate playback. @public */
  readonly id: number;
  /** Reconstructed Lynx-style effect selected by the simulation. @public */
  readonly kind:
    | 'menu-move'
    | 'menu-select'
    | 'countdown'
    | 'jump'
    | 'land'
    | 'crash'
    | 'score'
    | 'wipeout'
    | 'kick'
    | 'fall'
    | 'time-warning'
    | 'high-score'
    | 'finish';
}
