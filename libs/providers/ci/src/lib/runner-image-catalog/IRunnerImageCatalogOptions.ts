export interface IRunnerImageCatalogOptions {
  readonly fetch?: typeof fetch;
  readonly clock?: () => Date;
  /** Optional GitHub token used only to raise the unauthenticated rate limit. */
  readonly token?: () => Promise<string | undefined>;
}
