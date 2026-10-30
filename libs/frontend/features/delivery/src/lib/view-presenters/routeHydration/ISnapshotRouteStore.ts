export interface ISnapshotRouteStore {
  initialize(): Promise<void>;
  refresh(): Promise<void>;
  refreshContinuousIntegrationRuns(includeWorkflowCatalog?: boolean): Promise<void>;
}
