// #region Imports

import type { StorageUsageDto } from '@symphony/ipc-contracts-platform';
import type { IStorageBreakdownEntry } from './IStorageBreakdownEntry';
import { segmentItemId } from './segmentItemId';
import type { StorageSegmentVariant } from './StorageSegmentVariant';

// #endregion

/**
 * The occupied shares worth drawing. Empty while no completed measurement backs `usage`: a
 * tree too large to walk inline reports 0 until the background pass finishes, and drawing that
 * as a measured value tells the reader the disk is empty.
 */
export function storageBreakdownEntries(
  usage: StorageUsageDto | undefined,
  measured: boolean,
): readonly IStorageBreakdownEntry[] {
  if (!usage || !measured) return [];
  return usage.segments
    .map((segment, index) => ({
      id: segment.id,
      segmentItemId: segmentItemId(usage, segment.id),
      label: segment.label,
      description: segment.description,
      allocatedBytes: segment.allocatedBytes,
      variant: segmentVariants[index % segmentVariants.length] as StorageSegmentVariant,
    }))
    .filter((entry) => entry.allocatedBytes > 0);
}

/**
 * Categorical colours for the measured shares, ordered so neighbouring categories never share
 * a hue in the Symphony palette. Assigned by declared position rather than by the filtered
 * list, so a category keeps its colour when a neighbouring one drops to zero. `success` and
 * `danger` stay out of the palette: they carry the pressure signal on the outlined dot of the
 * remaining free space, and `danger` is too close to `primary` to read as its own category.
 */
const segmentVariants: readonly StorageSegmentVariant[] = [
  'primary',
  'info',
  'secondary',
  'highlight',
  'tertiary',
  'warning',
];
