// #region Imports

import { githubTokenCache } from './GithubTokenCache';
import { githubTokenCacheKey } from './githubTokenCacheKey';

// #endregion

/**
 * Drops cached tokens. Without arguments it clears every host, which is what a login or logout
 * needs: the account list itself has just changed.
 */
export function forgetGitHubToken(hostname?: string, login?: string): void {
  if (!hostname) {
    githubTokenCache.clear();
    return;
  }
  githubTokenCache.delete(githubTokenCacheKey(hostname, login));
  if (login === undefined) {
    for (const key of githubTokenCache.keys()) {
      if (key.startsWith(`${hostname}\u0000`)) githubTokenCache.delete(key);
    }
  }
}
