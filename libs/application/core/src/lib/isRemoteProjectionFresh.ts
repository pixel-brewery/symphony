/** Applies the remote projection age policy to persisted or in-memory refresh times. */
export function isRemoteProjectionFresh(
  refreshedAt: string | number,
  maxAgeMilliseconds = 60_000,
): boolean {
  const refreshed = typeof refreshedAt === 'string' ? Date.parse(refreshedAt) : refreshedAt;
  if (typeof refreshedAt === 'string' && !Number.isFinite(refreshed)) return false;
  const maxAge = Math.max(1_000, maxAgeMilliseconds);
  return Date.now() - refreshed < maxAge;
}
