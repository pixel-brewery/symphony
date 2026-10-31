/** Identity of the selected ci read model, captured before provider reads. */
export interface IContinuousIntegrationProjectionScope {
  readonly workspaceIds: readonly string[];
  readonly continuousIntegration: string;
}
