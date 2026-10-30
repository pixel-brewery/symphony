/** Recognizes the failures that mean a cached token is no longer accepted. */
export function isGitHubAuthenticationFailure(cause: unknown): boolean {
  const message = cause instanceof Error ? cause.message : String(cause ?? '');
  return /HTTP 401|bad credentials|requires authentication|token has expired/iu.test(message);
}
