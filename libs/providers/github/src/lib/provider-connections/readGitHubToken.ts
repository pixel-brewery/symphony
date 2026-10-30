// #region Imports

import { githubTokenCache } from './GithubTokenCache';
import { githubTokenCacheKey } from './githubTokenCacheKey';
import { resolveGitHubAccountLogin } from './resolveGitHubAccountLogin';
import { runAllowedCommand } from './runAllowedCommand';

// #endregion

export async function readGitHubToken(
  hostname: string,
  login: string | undefined,
): Promise<string | undefined> {
  const cacheKey = githubTokenCacheKey(hostname, login);
  const cached = githubTokenCache.get(cacheKey);
  if (cached && Date.now() - cached.readAt < GITHUB_TOKEN_CACHE_MILLISECONDS) return cached.token;

  const readToken = async (accountLogin?: string): Promise<string | undefined> => {
    try {
      const result = await runAllowedCommand('gh', [
        'auth',
        'token',
        '--hostname',
        hostname,
        ...(accountLogin ? ['--user', accountLogin] : []),
      ]);
      return result.stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  };

  const remember = (token: string | undefined): string | undefined => {
    if (token) githubTokenCache.set(cacheKey, { token, readAt: Date.now() });
    else githubTokenCache.delete(cacheKey);
    return token;
  };

  const exactToken = await readToken(login);
  if (exactToken || !login) return remember(exactToken);

  try {
    const result = await runAllowedCommand('gh', ['auth', 'status', '--json', 'hosts']);
    const accountLogin = resolveGitHubAccountLogin(result.stdout, hostname, login);
    return remember(accountLogin ? await readToken(accountLogin) : undefined);
  } catch {
    return remember(undefined);
  }
}

const GITHUB_TOKEN_CACHE_MILLISECONDS = 5 * 60_000;
