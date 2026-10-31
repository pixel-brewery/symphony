/**
 * Consumes only the Ci startup work selected by the product composition.
 *
 * @public
 */
export interface IApplicationBootstrapCi {
  refreshContinuousIntegrationUsage(
    repositoryBindingIds?: readonly string[],
    silent?: boolean,
  ): Promise<boolean>;
  refreshContinuousIntegrationRuns(includeWorkflowCatalog?: boolean): Promise<void>;
}
