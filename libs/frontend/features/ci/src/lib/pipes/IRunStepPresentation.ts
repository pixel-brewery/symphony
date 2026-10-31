/**
 * The icon of a step in the selected run's step list.
 *
 * @public
 */
export interface IRunStepPresentation {
  /** Registered icon name. @public @readonly */
  readonly icon: string;
  /** Icon variant. @public @readonly */
  readonly variant: 'default' | 'danger' | 'neutral';
}
