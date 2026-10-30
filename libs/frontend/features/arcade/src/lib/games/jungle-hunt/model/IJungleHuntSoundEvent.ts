/** Ordered effects emitted at simulation transitions. @public */
export interface IJungleHuntSoundEvent {
  readonly id: number;
  readonly kind:
    | 'start'
    | 'jump'
    | 'vine'
    | 'knife'
    | 'crocodile'
    | 'boulder'
    | 'guard'
    | 'death'
    | 'air'
    | 'section'
    | 'rescue'
    | 'extraLife'
    | 'gameOver';
}
