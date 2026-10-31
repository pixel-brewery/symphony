// #region Imports

import { describe, expect, it } from 'vitest';
import { TruncateStartPipe } from './TruncateStartPipe';

// #endregion

describe('TruncateStartPipe', () => {
  const pipe = new TruncateStartPipe();

  it('keeps values that fit the configured maximum length', () => {
    // act
    const actual = pipe.transform('codex/work-26', 13);

    // assert
    expect(actual).toBe('codex/work-26');
  });

  it('preserves the end of long values behind a leading ellipsis', () => {
    // act
    const actual = pipe.transform('abcdefghijklmnopqrstuvwxyz', 10);

    // assert
    expect(actual).toBe('...tuvwxyz');
  });

  it('uses a 50-character maximum by default', () => {
    // arrange
    const value = `prefix-${'x'.repeat(50)}`;
    // act
    const result = pipe.transform(value);

    // assert
    expect(result).toHaveLength(50);
    expect(result).toBe(`...${value.slice(-47)}`);
  });
});
