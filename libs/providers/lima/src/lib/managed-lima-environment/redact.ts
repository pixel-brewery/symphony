export function redact(value: string): string {
  return value
    .replace(/registration token[^\n]*/giu, 'registration token [redacted]')
    .replace(/\b(?:github_pat_|gh[pousr]_)[a-zA-Z0-9_]{16,}\b/gu, '[redacted]')
    .replace(/((?:password|secret|token|key)\s*[:=]\s*)[^\s]+/giu, '$1[redacted]')
    .trim();
}
