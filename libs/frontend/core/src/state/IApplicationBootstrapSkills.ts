/**
 * Consumes only the Skills startup work selected by the product composition.
 *
 * @public
 */
export interface IApplicationBootstrapSkills {
  refreshSkills(): Promise<void>;
}
