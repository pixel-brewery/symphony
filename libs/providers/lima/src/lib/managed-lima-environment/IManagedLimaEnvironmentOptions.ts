// #region Imports

import { type ChildProcess } from 'node:child_process';

// #endregion

export interface IManagedLimaEnvironmentOptions {
  readonly fetch?: typeof fetch;
  readonly platform?: NodeJS.Platform;
  readonly architecture?: string;
  readonly execute?: (
    executable: string,
    arguments_: readonly string[],
    environment: NodeJS.ProcessEnv,
    signal: AbortSignal,
    timeoutMilliseconds: number,
  ) => Promise<string>;
  readonly spawn?: (
    executable: string,
    arguments_: readonly string[],
    environment: NodeJS.ProcessEnv,
  ) => ChildProcess;
}
