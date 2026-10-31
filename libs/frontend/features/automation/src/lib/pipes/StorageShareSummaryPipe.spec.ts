// @vitest-environment jsdom

// #region Imports

import { describe, expect, it } from 'vitest';
import { StorageShareSummaryPipe } from './StorageShareSummaryPipe';

// #endregion

describe('StorageShareSummaryPipe', () => {
  it('joins measured shares with their limits and shows a dash for unmeasured ones', () => {
    // arrange
    const pipe = new StorageShareSummaryPipe();

    // act
    const line = pipe.transform([
      { label: 'FLAMOX365', allocatedBytes: 2 * 1024 ** 3, limitGiB: 20 },
      { label: 'Personal', allocatedBytes: undefined, limitGiB: 20 },
      { label: 'base image', allocatedBytes: 0 },
    ]);

    // assert
    expect(line).toMatch(/^FLAMOX365 .+ of 20 GB · Personal — of 20 GB · base image .+$/u);
  });
});
