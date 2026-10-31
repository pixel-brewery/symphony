// #region Imports

import type { ISegmentedAllocation } from './ISegmentedAllocation';
import type { IStorageSegment } from './IStorageSegment';
import type { IUsageGroup } from './IUsageGroup';
import { bucketKey } from './bucketKey';
import { groupTotal } from './GroupTotal';

// #endregion

export function segments(
  group: IUsageGroup,
  groups: readonly IUsageGroup[],
  allocation: ISegmentedAllocation,
): readonly IStorageSegment[] {
  return group.segments.map((segment) => ({
    id: segment.id,
    label: segment.label,
    description: segment.description,
    allocatedBytes: segment.from
      ? segment.from.reduce((total, groupId) => {
          const source = groups.find((candidate) => candidate.id === groupId);
          return total + (source ? groupTotal(source, allocation) : 0);
        }, 0)
      : (allocation.bySegment.get(bucketKey(group.id, segment.id)) ?? 0),
  }));
}
