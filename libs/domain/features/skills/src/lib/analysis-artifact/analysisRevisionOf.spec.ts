// #region Imports

import { describe, expect, it } from 'vitest';
import { analysisRevisionOf } from './analysisRevisionOf';

// #endregion

const hashes = new Map([
  [
    'A complete analysis artifact',
    '9b50f16b8fc4fb75b13c8c43ea395cd4f60712deb7f3cdbd6fd7512b0ef87f6e',
  ],
  [
    'A complete analysis artifact changed',
    '2988dd94d21381eca9c163ca9b673d072ea4dd0bd4ab8d43bf3ad6f2812cd725',
  ],
]);
const digest = (text: string): string => {
  const hash = hashes.get(text);
  if (!hash) throw new Error('Unexpected analysis digest input.');
  return hash;
};

describe('analysisRevisionOf', () => {
  it('derives a stable content-addressed analysis revision', () => {
    // arrange
    const text = 'A complete analysis artifact';

    // act
    const actual = analysisRevisionOf(text, digest);

    // assert
    expect(actual).toBe(analysisRevisionOf(text, digest));
    expect(analysisRevisionOf(text, digest)).not.toBe(
      analysisRevisionOf(`${text} changed`, digest),
    );
  });
});
