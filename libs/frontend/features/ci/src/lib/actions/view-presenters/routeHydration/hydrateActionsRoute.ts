/**
 * Hydrates Actions through the existing application initialization and CI refresh owners.
 *
 * @param store - The two operations consumed by this route's hydration sequence.
 * @public
 */
export async function hydrateActionsRoute(store: {
  initialize(): Promise<void>;
  refreshContinuousIntegrationRuns(includeWorkflowCatalog?: boolean): Promise<void>;
}): Promise<void> {
  await store.initialize();
  await store.refreshContinuousIntegrationRuns(true);
}
