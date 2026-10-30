/** Retains post-authentication reconciliation through its existing owners. @public */
export interface IWorkConnectionRefresh {
  refreshSettings(): Promise<void>;
  refreshContinuousIntegrationUsage(
    repositoryBindingIds?: readonly string[],
    silent?: boolean,
  ): Promise<boolean> | undefined;
}
