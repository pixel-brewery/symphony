const MAX_ERROR_CAUSE_DEPTH = 5;
/**
 * Bounds diagnostic cause serialization without exposing another failure boundary.
 *
 * @public
 */
export function safeError(cause: unknown): string {
  if (!(cause instanceof Error)) return 'Unknown orchestrator failure';
  // A wrapped error names the operation; only its cause names the fault, so the log keeps the
  // whole chain instead of the outermost summary a reader cannot act on.
  const messages: string[] = [];
  let current: unknown = cause;
  while (current instanceof Error && messages.length < MAX_ERROR_CAUSE_DEPTH) {
    if (current.message) messages.push(current.message);
    current = current.cause;
  }
  return messages.join(' Caused by: ');
}
