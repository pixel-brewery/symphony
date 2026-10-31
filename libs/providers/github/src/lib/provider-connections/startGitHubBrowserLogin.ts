// #region Imports

import { spawn } from 'node:child_process';
import { resolveAllowedCommand } from '@symphony/providers-core';
import { forgetGitHubToken } from './forgetGitHubToken';
import { githubCliEnvironment } from './githubCliEnvironment';

// #endregion

export function startGitHubBrowserLogin(hostname: string, gitProtocol: 'https' | 'ssh'): void {
  forgetGitHubToken();
  startDetached('gh', [
    'auth',
    'login',
    '--hostname',
    hostname,
    '--git-protocol',
    gitProtocol,
    '--web',
    '--clipboard',
    '--scopes',
    'read:org,repo',
    ...(gitProtocol === 'ssh' ? ['--skip-ssh-key'] : []),
  ]);
}

function startDetached(
  command: 'codex' | 'gh',
  args: readonly string[],
  environment?: NodeJS.ProcessEnv,
): void {
  const effectiveEnvironment =
    environment ?? (command === 'gh' ? githubCliEnvironment() : process.env);
  const child = spawn(resolveAllowedCommand(command, effectiveEnvironment), [...args], {
    detached: process.platform !== 'win32',
    env: effectiveEnvironment,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.once('error', () => undefined);
  child.unref();
}
