/**
 * Consumes only the Platform startup work selected by the product composition.
 *
 * @public
 */
export interface IApplicationBootstrapPlatform {
  initializeIncidents(): void;
}
