export /**
 * Cached GitHub tokens, keyed by host and account.
 *
 * Every GitHub request in the orchestrator runs through the `gh` CLI, and reading the token is
 * a second process launch that hits the OS keychain. Doing that per request doubled the cost of
 * the whole GitHub surface, so a resolved token is reused for a short window and dropped
 * whenever a login, a logout, or a failed request makes it suspect.
 */
const githubTokenCache = new Map<string, { readonly token: string; readonly readAt: number }>();
