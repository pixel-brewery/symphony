export interface IManagedLimaCleanupResult {
  readonly removedInstances: number;
  readonly failedInstances: number;
  readonly removedConfigurationFiles: number;
}
