export function githubTokenCacheKey(hostname: string, login: string | undefined): string {
  return `${hostname}\u0000${login ?? ''}`;
}
