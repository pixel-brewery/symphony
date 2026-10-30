// #region Imports

import { isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { LOGIN_SHELL_COMMAND } from './LoginShellCommand';
import { LOGIN_SHELL_TIMEOUT_MS } from './LoginShellTimeoutMs';
import { pathDirectories } from './pathDirectories';
import { reportedPath } from './ReportedPath';
import { startedWithoutUserEnvironment } from './StartedWithoutUserEnvironment';

// #endregion

export function readLoginShellPath(environment: NodeJS.ProcessEnv): readonly string[] {
  if (process.platform === 'win32' || !startedWithoutUserEnvironment(environment)) return [];
  const shell = environment['SHELL'] ?? '/bin/zsh';
  if (!isAbsolute(shell)) return [];
  // An interactive login shell also reads the files version managers install into, but not every
  // shell tolerates `-i` without a terminal, so a plain login shell is tried afterwards.
  for (const invocation of ['-ilc', '-lc'] as const) {
    try {
      const output = execFileSync(shell, [invocation, LOGIN_SHELL_COMMAND], {
        encoding: 'utf8',
        env: environment,
        maxBuffer: 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: LOGIN_SHELL_TIMEOUT_MS,
        windowsHide: true,
      });
      const directories = pathDirectories(reportedPath(output));
      if (directories.length) return directories;
    } catch {
      // Startup files can fail or hang; the well-known directories remain as the fallback.
    }
  }
  return [];
}
