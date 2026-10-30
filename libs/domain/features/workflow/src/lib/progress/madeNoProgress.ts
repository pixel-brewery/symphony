/** True when the new attempt reproduces the previous one without any material change. */
export function madeNoProgress(previous: string | undefined, next: string): boolean {
  return previous !== undefined && previous === next;
}
