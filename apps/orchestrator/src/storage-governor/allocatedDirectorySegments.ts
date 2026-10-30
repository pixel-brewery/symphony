// #region Imports

import type { ISegmentedAllocation } from './ISegmentedAllocation';
import { walkAllocatedBytes } from './WalkAllocatedBytes';

// #endregion

export function allocatedDirectorySegments(
  paths: readonly string[],
  attribution: ReadonlyMap<string, string> = new Map(),
): ISegmentedAllocation {
  const walk = walkAllocatedBytes(paths, attribution);
  for (;;) {
    const step = walk.next();
    if (step.done) return step.value;
  }
}
