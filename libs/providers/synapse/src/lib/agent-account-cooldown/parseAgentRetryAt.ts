// #region Imports

import { timestamp } from './timestamp';

// #endregion

export function parseAgentRetryAt(message: string, now = new Date()): string | undefined {
  const iso = message.match(
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})\b/u,
  )?.[0];
  if (iso) {
    const parsed = timestamp(iso);
    if (parsed > now.getTime()) return new Date(parsed).toISOString();
  }
  const retryAfterSeconds = message.match(/retry[- ]?after\s*[:=]\s*(\d+(?:\.\d+)?)\b/iu)?.[1];
  if (retryAfterSeconds) {
    const seconds = Number(retryAfterSeconds);
    if (Number.isFinite(seconds) && seconds > 0) {
      return new Date(now.getTime() + seconds * 1_000).toISOString();
    }
  }
  const duration = message.match(
    /(?:retry[- ]?after|try again in|resets? in)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec(?:ond)?s?|m|min(?:ute)?s?|h|hours?)/iu,
  );
  if (!duration) return undefined;
  const value = Number(duration[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const unit = duration[2]?.toLowerCase() ?? 's';
  const multiplier = unit.startsWith('ms')
    ? 1
    : unit === 'm' || unit.startsWith('min')
      ? 60_000
      : unit === 'h' || unit.startsWith('hour')
        ? 60 * 60_000
        : 1_000;
  return new Date(now.getTime() + value * multiplier).toISOString();
}
