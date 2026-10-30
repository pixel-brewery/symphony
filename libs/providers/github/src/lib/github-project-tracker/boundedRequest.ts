export function boundedRequest(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, 8_000);
}
