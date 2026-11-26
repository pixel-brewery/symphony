/**
 * Extracts the existing product error explanation without serializing a cause or stack.
 *
 * @param cause - Domain admission or mobile validation failure.
 * @returns The error message, or the generic product fallback for non-errors.
 * @public
 */
export function safeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Mobile access failed.';
}
