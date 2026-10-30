export interface ILocalVerificationExecutorOptions {
  /**
   * Application-owned directory that survives a run. Package-manager and Corepack caches live here
   * so a verification does not download its own package manager again for every step, and so a
   * step declared as network-free stays network-free after the first run.
   */
  readonly cacheRoot?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly resolveExecutable?: (
    executable: string,
    environment: NodeJS.ProcessEnv,
  ) => string | undefined;
}
