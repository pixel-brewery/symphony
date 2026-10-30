/** Ordered game sounds consumed exactly once by the browser audio adapter. @public */
export interface IBoxingSoundEvent {
  readonly id: number;
  readonly kind: 'bell' | 'jab' | 'body' | 'payoff' | 'block' | 'knockdown' | 'count' | 'victory';
}
