// #region Imports

import type { GithubLocalRunnerCleanupResult } from './GithubLocalRunnerCleanupResult';
import type { IGithubLocalRunnerInput } from './IGithubLocalRunnerInput';
import type { IGithubLocalRunnerSession } from './IGithubLocalRunnerSession';

// #endregion

export interface IGithubLocalRunner {
  /** The pinned GitHub Actions runner version, when the adapter uses a fixed version. */
  readonly version?: string;
  start(input: IGithubLocalRunnerInput, signal: AbortSignal): Promise<IGithubLocalRunnerSession>;
  cleanup(
    runtimeRoot: string,
    signal: AbortSignal,
    preserve?: readonly string[],
  ): Promise<GithubLocalRunnerCleanupResult>;
}
