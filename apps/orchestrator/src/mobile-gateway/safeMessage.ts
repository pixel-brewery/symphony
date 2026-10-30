export function safeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Mobile access failed.';
}
