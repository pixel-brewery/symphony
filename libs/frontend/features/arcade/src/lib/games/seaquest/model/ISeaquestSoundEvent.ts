/** A lifetime-unique trigger for the original two-channel Seaquest sound driver. @public */
export interface ISeaquestSoundEvent {
  readonly id: number;
  readonly frame?: number;
  readonly kind:
    | 'shoot'
    | 'shot-end'
    | 'enemy'
    | 'enemy-shark'
    | 'enemy-sub'
    | 'diver'
    | 'full'
    | 'surface'
    | 'bonus'
    | 'refill'
    | 'warning'
    | 'death'
    | 'extra-life'
    | 'completed';
  readonly oxygen?: number;
  readonly value?: number;
  readonly target?: 'shark' | 'sub';
  readonly durationFrames?: number;
}
