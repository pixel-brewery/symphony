/** Refreshes the existing repository approval projection. @public */
export interface IExecutionRuntime {
  refreshRepositoryRuntime(): Promise<boolean>;
}
