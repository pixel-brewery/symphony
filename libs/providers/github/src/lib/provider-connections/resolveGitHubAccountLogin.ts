// #region Imports

import type { IGitHubStatusDocument } from './IGitHubStatusDocument';

// #endregion

export function resolveGitHubAccountLogin(
  statusOutput: string,
  hostname: string,
  login: string,
): string | undefined {
  const document = JSON.parse(statusOutput) as IGitHubStatusDocument;
  return document.hosts?.[hostname]?.find(
    (entry) => entry.state === 'success' && entry.login?.toLowerCase() === login.toLowerCase(),
  )?.login;
}
