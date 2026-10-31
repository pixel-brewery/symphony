export function redactedLog(value: string): string {
  return value
    .replace(/\b(?:github_pat_|gh[pousr]_)[a-zA-Z0-9_]{16,}\b/gu, '[redacted]')
    .replace(/\bsk-[a-zA-Z0-9_-]{16,}\b/gu, '[redacted]')
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/giu, '$1[redacted]')
    .trim();
}
