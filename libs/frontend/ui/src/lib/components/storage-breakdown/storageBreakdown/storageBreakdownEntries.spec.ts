// #region Imports

import { describe, expect, it } from 'vitest';
import type { StorageUsageDto } from '@symphony/ipc-contracts-platform';
import { storageBreakdownEntries } from './';

// #endregion

function usage(overrides: Partial<StorageUsageDto> = {}): StorageUsageDto {
  return {
    id: 'workspace:personal',
    label: 'Personal',
    allocatedBytes: 6 * 1024 ** 3,
    limitBytes: 8 * 1024 ** 3,
    usagePercent: 75,
    pressure: 'warning',
    segments: [
      {
        id: 'application-state',
        label: 'Application state',
        description: 'Settings and the database.',
        allocatedBytes: 4 * 1024 ** 3,
      },
      {
        id: 'local-ci',
        label: 'Local GitHub Actions',
        description: 'Runner data.',
        allocatedBytes: 0,
      },
      {
        id: 'workspaces',
        label: 'Managed workspaces',
        description: 'Repositories and worktrees.',
        allocatedBytes: 2 * 1024 ** 3,
      },
    ],
    ...overrides,
  } as StorageUsageDto;
}

describe('storageBreakdownEntries', () => {
  it('draws the occupied shares', () => {
    // act
    const actual = storageBreakdownEntries(usage(), true);

    // assert
    expect(actual).toEqual([
      // Colours follow the declared position, not the filtered list, so a category keeps its
      // colour when a neighbour drops out of the bar - here the zero-byte runner share.
      expect.objectContaining({
        id: 'application-state',
        segmentItemId: 'storage-segment-workspace-personal-application-state',
        variant: 'primary',
      }),
      expect.objectContaining({
        id: 'workspaces',
        segmentItemId: 'storage-segment-workspace-personal-workspaces',
        variant: 'secondary',
      }),
    ]);
  });

  it('draws nothing rather than claiming an empty disk while the walk is still running', () => {
    // A tree too large to measure inline reports 0 until the background pass completes.
    // Drawing that as a measured value tells the reader the disk is empty, which is the one
    // thing this bar must never say.
    // arrange
    const pending = usage({ allocatedBytes: 0, usagePercent: 0, pressure: 'healthy' });

    // act
    const actual = storageBreakdownEntries(pending, false);

    // assert
    expect(actual).toEqual([]);
  });

  it('draws nothing until a status arrives at all', () => {
    // act
    const actual = storageBreakdownEntries(undefined, true);

    // assert
    expect(actual).toEqual([]);
  });

  it('creates selector-safe ids from provider-owned segment identifiers', () => {
    // arrange
    const measured = usage({
      segments: [
        {
          id: 'browser data:cache',
          label: 'Browser data',
          description: 'Cached browser state.',
          allocatedBytes: 2 * 1024 ** 3,
        },
      ],
    });

    // act
    const actual = storageBreakdownEntries(measured, true);

    // assert
    expect(actual[0]?.segmentItemId).toBe('storage-segment-workspace-personal-browser-data-cache');
  });
});
