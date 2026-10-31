// #region Imports

import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './formatRelativeTime';

// #endregion

describe('formatRelativeTime', () => {
  const now = new Date(2026, 9, 30, 14, 0, 0).getTime();

  it('formats compact ages for minutes, hours, yesterday and days', () => {
    // arrange
    const minutes = new Date(2026, 9, 30, 13, 48).toISOString();
    const hours = new Date(2026, 9, 30, 11, 0).toISOString();
    const yesterday = new Date(2026, 9, 29, 9, 0).toISOString();
    const days = new Date(2026, 9, 26, 9, 0).toISOString();

    // act
    const labels = [minutes, hours, yesterday, days].map((value) => formatRelativeTime(value, now));

    // assert
    expect(labels).toEqual(['12 min', '3 h', 'Yesterday', '4 days']);
  });

  it('appends the suffix and falls back to the date after a week', () => {
    // arrange
    const recent = new Date(2026, 9, 30, 13, 58).toISOString();
    const old = new Date(2026, 9, 1, 9, 0).toISOString();

    // act
    const labels = [
      formatRelativeTime(recent, now, true),
      formatRelativeTime(old, now, true),
      formatRelativeTime(now - 10_000, now, true),
    ];

    // assert
    expect(labels).toEqual(['2 min ago', 'on Oct 1', 'just now']);
  });

  it('returns an empty label for missing or invalid values', () => {
    // arrange
    const values = [undefined, null, '', 'not a date'];

    // act
    const labels = values.map((value) => formatRelativeTime(value, now));

    // assert
    expect(labels).toEqual(['', '', '', '']);
  });
});
