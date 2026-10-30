/** An ordered sound trigger, with an identifier unique throughout a game object's lifetime. @public */
export interface IPitfallSoundEvent {
  readonly id: number;
  readonly kind: 'jump' | 'swing' | 'treasure' | 'death' | 'fall' | 'log' | 'wall';
}
