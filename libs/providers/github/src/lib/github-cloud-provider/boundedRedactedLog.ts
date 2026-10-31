// #region Imports

import { redactedLog } from './redactedLog';

// #endregion

export function boundedRedactedLog(value: string, omissionMessage: string): string | undefined {
  const redacted = redactedLog(value);
  if (!redacted) return undefined;
  const maximum = 64_000;
  if (redacted.length <= maximum) return redacted;
  const suffix = `\n${omissionMessage}`;
  return `${redacted.slice(-(maximum - suffix.length))}${suffix}`;
}
