const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Formats how long ago a moment was, the way the macOS lists in the redesign show it.
 *
 * Without a suffix the result is a compact age (`now`, `12 min`, `3 h`, `Yesterday`, `4 days`,
 * `Oct 24`); with the suffix it reads as a sentence fragment (`just now`, `12 min ago`, `3 h ago`,
 * `Yesterday`, `4 days ago`, `on Oct 24`).
 *
 * @param value - ISO timestamp or epoch milliseconds.
 * @param now - Reference time in epoch milliseconds.
 * @param withSuffix - Whether to append `ago`.
 * @returns The formatted age, or an empty string for a missing or invalid value.
 * @public
 */
export function formatRelativeTime(
  value: string | number | null | undefined,
  now: number,
  withSuffix = false,
): string {
  if (value === null || value === undefined || value === '') return '';
  const time = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(time)) return '';
  const elapsed = Math.max(0, now - time);
  if (elapsed < MINUTE) return withSuffix ? 'just now' : 'now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min${withSuffix ? ' ago' : ''}`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h${withSuffix ? ' ago' : ''}`;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.getTime();
  if (time >= startOfToday - DAY) return 'Yesterday';
  const days = Math.ceil((startOfToday - time) / DAY);
  if (days < 7) return `${days} days${withSuffix ? ' ago' : ''}`;
  const date = new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return withSuffix ? `on ${date}` : date;
}
