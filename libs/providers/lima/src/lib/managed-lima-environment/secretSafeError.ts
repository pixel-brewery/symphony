// #region Imports

import { redact } from './redact';

// #endregion

export function secretSafeError(context: string, cause: unknown): Error {
  const message = cause instanceof Error ? redact(cause.message) : 'Unknown error';
  return new Error(`${context}: ${message}`, { cause });
}
