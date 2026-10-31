/**
 * How a board card's status chip renders.
 *
 * @public
 */
export interface IBoardCardStatusPresentation {
  readonly label: string;
  readonly appearance: 'soft' | 'outline';
  readonly variant: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  /** Icon for the states that need a person, so colour never carries the meaning alone. */
  readonly iconName?: 'errorCircle' | 'warning';
}
