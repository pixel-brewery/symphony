/** A lifetime-unique sound trigger, retained until the next simulation step. @public */
export interface IPitfallIISoundEvent {
  readonly id: number;
  readonly frame?: number;
  readonly kind:
    'jump' | 'fall' | 'treasure' | 'checkpoint' | 'hurt' | 'balloon' | 'pop' | 'splash' | 'victory';
}
