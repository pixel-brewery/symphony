// #region Imports

import { GIT_TIMEOUT_MILLISECONDS } from './GitTimeoutMilliseconds';
import { execFileAsync } from '@symphony/providers-core';

// #endregion

export async function defaultExecute(
  executable: string,
  arguments_: readonly string[],
  cwd: string,
  signal: AbortSignal,
): Promise<string> {
  const { stdout } = await execFileAsync(executable, [...arguments_], {
    cwd,
    encoding: 'utf8',
    signal,
    timeout: GIT_TIMEOUT_MILLISECONDS,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: '0',
      GIT_TERMINAL_PROMPT: '0',
    },
  });
  return stdout;
}
