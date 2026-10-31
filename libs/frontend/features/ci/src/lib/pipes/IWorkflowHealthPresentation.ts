/**
 * How a workflow's dot looks and what it says to assistive technology.
 *
 * @public
 */
export interface IWorkflowHealthPresentation {
  /** Dot variant. @public @readonly */
  readonly variant: 'danger' | 'success' | 'neutral';
  /** Accessible description of the dot. @public @readonly */
  readonly label: string;
}
