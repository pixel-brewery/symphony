/**
 * Consumes only the Execution startup work selected by the product composition.
 *
 * @public
 */
export interface IApplicationBootstrapExecution {
  initialize(): void;
}
