export function normalizedRepository(repositoryUrl: string): string {
  const repository = new URL(repositoryUrl);
  return `${repository.hostname.toLowerCase()}${repository.pathname.replace(/\/+$/u, '').toLowerCase()}`;
}
