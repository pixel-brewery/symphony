// #region Imports

import type { StorageUsageDto } from '@symphony/ipc-contracts-platform';

// #endregion

/** Returns the stable DOM id used to associate a legend item with its segment data item. */
export function segmentItemId(usage: StorageUsageDto, segmentId: string): string {
  const usagePart = usage.id.replace(/[^a-zA-Z0-9-]/gu, '-');
  const segmentPart = segmentId.replace(/[^a-zA-Z0-9-]/gu, '-');

  return `storage-segment-${usagePart}-${segmentPart}`;
}
