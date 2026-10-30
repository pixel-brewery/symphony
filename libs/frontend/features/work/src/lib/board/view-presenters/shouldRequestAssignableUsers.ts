/**
 * Decides whether one assignable-user scope needs a provider request. Automatic preload does
 * not retry a failed scope: otherwise removing its loading marker immediately starts the same
 * request again and turns one provider failure into an unbounded notification loop. A later
 * user-triggered card-menu action may retry it explicitly.
 */
export function shouldRequestAssignableUsers(
  loaded: boolean,
  loading: boolean,
  failed: boolean,
  retryFailed: boolean,
): boolean {
  return !loaded && !loading && (!failed || retryFailed);
}
