export interface IWorkItemHealthPresentation {
  readonly iconName: 'errorCircle' | 'info';
  readonly variant: 'danger' | 'info';
  /** Short enough for a card tooltip; the full text belongs in the opened item. */
  readonly tooltip: string;
  readonly ariaLabel: string;
}
