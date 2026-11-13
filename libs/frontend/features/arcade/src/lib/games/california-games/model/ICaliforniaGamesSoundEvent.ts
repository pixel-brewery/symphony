/** One edge-triggered sound produced by the deterministic simulation. @public */
export interface ICaliforniaGamesSoundEvent {
  readonly id: number;
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
