/** Identity of the selected work read model, captured before provider reads. */
export interface IWorkTrackingProjectionScope {
  readonly workspaceIds: readonly string[];
  readonly workTracking: string;
}
