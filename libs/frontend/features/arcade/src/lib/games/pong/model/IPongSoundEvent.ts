/** A sound gate with its original scan-line phase and a lifetime-unique trigger. @public */
export interface IPongSoundEvent {
  readonly id: number;
  readonly kind: 'paddle' | 'wall' | 'score';
  readonly frame: number;
  readonly line: number;
  readonly ballCounter: number;
  readonly verticalLoad: number;
}
