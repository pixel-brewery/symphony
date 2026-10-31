export function trimProtocol(value: string): string {
  return value.replace(/^\s*\n/u, '').replace(/\n\s*$/u, '');
}
