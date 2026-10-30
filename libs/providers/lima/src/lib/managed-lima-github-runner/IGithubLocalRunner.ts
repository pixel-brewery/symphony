// #region Imports

import type { GithubLocalRunnerCleanupResult } from './GithubLocalRunnerCleanupResult';
import type { IGithubLocalRunnerInput } from './IGithubLocalRunnerInput';
import type { IGithubLocalRunnerSession } from './IGithubLocalRunnerSession';

// #endregion

export interface IGithubLocalRunner {
  start(input: IGithubLocalRunnerInput, signal: AbortSignal): Promise<IGithubLocalRunnerSession>;
  cleanup(
    runtimeRoot: string,
    signal: AbortSignal,
    preserve?: readonly string[],
  ): Promise<GithubLocalRunnerCleanupResult>;
}
