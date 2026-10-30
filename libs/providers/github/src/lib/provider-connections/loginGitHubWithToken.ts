// #region Imports

import { forgetGitHubToken } from './forgetGitHubToken';
import { runAllowedCommand } from './runAllowedCommand';

// #endregion

export async function loginGitHubWithToken(
  hostname: string,
  gitProtocol: 'https' | 'ssh',
  token: string,
): Promise<void> {
  await runAllowedCommand(
    'gh',
    ['auth', 'login', '--hostname', hostname, '--git-protocol', gitProtocol, '--with-token'],
    token,
  );
  forgetGitHubToken();
}
