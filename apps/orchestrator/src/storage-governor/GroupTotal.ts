// #region Imports

import type { ISegmentedAllocation } from './ISegmentedAllocation';
import type { IUsageGroup } from './IUsageGroup';
import { bucketKey } from './bucketKey';

// #endregion

export /**
 * The group total. The group that spans the walk reports the walk total, which also covers the
 * bytes no bucket claimed; every other group is exactly the sum of the buckets it owns.
 */
function groupTotal(group: IUsageGroup, allocation: ISegmentedAllocation): number {
  if (group.spansEverything) return allocation.totalBytes;
  return group.segments.reduce(
    (total, segment) => total + (allocation.bySegment.get(bucketKey(group.id, segment.id)) ?? 0),
    0,
  );
}
