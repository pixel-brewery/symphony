// #region Imports

import { forgetGitHubToken } from './forgetGitHubToken';
import { runAllowedCommand } from './runAllowedCommand';

// #endregion

export async function logoutGitHub(hostname: string, login: string): Promise<void> {
  await runAllowedCommand('gh', ['auth', 'logout', '--hostname', hostname, '--user', login]);
  forgetGitHubToken();
}
