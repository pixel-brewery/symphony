// #region Imports

import { describe, expect, it } from 'vitest';
import type { StorageUsageDto } from '@symphony/ipc-contracts-platform';
import { storageBreakdownRemainder } from './';

// #endregion

function usage(overrides: Partial<StorageUsageDto> = {}): StorageUsageDto {
  return {
    id: 'workspace:personal',
    label: 'Personal',
    allocatedBytes: 6 * 1024 ** 3,
    limitBytes: 8 * 1024 ** 3,
    usagePercent: 75,
    pressure: 'warning',
    segments: [],
    ...overrides,
  } as StorageUsageDto;
}

describe('storageBreakdownRemainder', () => {
  it('names the unused remainder', () => {
    // act
    const actual = storageBreakdownRemainder(usage(), true, 8);

    // assert
    expect(actual).toEqual({
      allocatedBytes: 2 * 1024 ** 3,
      description: 'Space left before the 8 GB limit stops new writes.',
    });
  });

  it('draws no remainder while the walk is still running', () => {
    // arrange
    const pending = usage({ allocatedBytes: 0, usagePercent: 0, pressure: 'healthy' });

    // act
    const actual = storageBreakdownRemainder(pending, false, 8);

    // assert
    expect(actual).toBeUndefined();
  });

  it('draws no remainder until a status arrives', () => {
    // act
    const actual = storageBreakdownRemainder(undefined, true, 8);

    // assert
    expect(actual).toBeUndefined();
  });
});
