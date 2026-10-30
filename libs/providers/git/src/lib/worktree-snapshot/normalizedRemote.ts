/** Reduces an HTTPS or SSH remote to `host/owner/name`. */
export function normalizedRemote(remote: string): string {
  const withoutSuffix = remote.trim().replace(/\.git$/u, '');
  const ssh = /^(?:ssh:\/\/)?[^@/]+@([^:/]+)[:/](.+)$/u.exec(withoutSuffix);
  if (ssh?.[1] && ssh[2]) return `${ssh[1]}/${ssh[2]}`.toLowerCase();
  try {
    const url = new URL(withoutSuffix);
    return `${url.hostname}${url.pathname.replace(/^\/+/u, '/')}`.toLowerCase();
  } catch {
    return withoutSuffix.toLowerCase();
  }
}
