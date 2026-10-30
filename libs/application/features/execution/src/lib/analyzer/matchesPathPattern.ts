export function matchesPathPattern(path: string, pattern: string): boolean {
  if (pattern === '**') return true;
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, '\\$&')
    .replaceAll('**', '\u0000')
    .replaceAll('*', '[^/]*')
    .replaceAll('\u0000', '.*');
  return new RegExp(`^${escaped}$`, 'u').test(path.replaceAll('\\', '/'));
}
