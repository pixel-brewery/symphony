// #region Imports
import { translateLabel } from '@symphony/frontend-intl/labels';
import { labelLocale } from '@symphony/frontend-intl/labels';

// #endregion

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
  if (elapsed < MINUTE)
    return withSuffix
      ? translateLabel('loc.symphony.labels.just.now.7ddb44d')
      : translateLabel('loc.symphony.labels.now.ed5eb9a');
  if (elapsed < HOUR)
    return withSuffix
      ? translateLabel('loc.symphony.labels.min.ago.dcf6607', Math.floor(elapsed / MINUTE))
      : translateLabel('loc.symphony.labels.min.96d15cf', Math.floor(elapsed / MINUTE));
  if (elapsed < DAY)
    return withSuffix
      ? translateLabel('loc.symphony.labels.h.ago.20d2827', Math.floor(elapsed / HOUR))
      : translateLabel('loc.symphony.labels.h.477a1b5', Math.floor(elapsed / HOUR));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.getTime();
  if (time >= startOfToday - DAY) return translateLabel('loc.symphony.labels.yesterday.5661812');
  const days = Math.ceil((startOfToday - time) / DAY);
  if (days < 7)
    return withSuffix
      ? translateLabel('loc.symphony.labels.days.ago.bef5eec', days)
      : translateLabel('loc.symphony.labels.days.af78beb', days);
  const date = new Date(time).toLocaleDateString(labelLocale(), { month: 'short', day: 'numeric' });
  return withSuffix ? translateLabel('loc.symphony.labels.on.e1950d9', date) : date;
}
