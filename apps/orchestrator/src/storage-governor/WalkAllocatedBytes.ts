// #region Imports

import { existsSync, lstatSync, readdirSync, type Stats } from 'node:fs';
import { resolve } from 'node:path';
import type { ISegmentedAllocation } from './ISegmentedAllocation';
import { allocatedBytes } from './allocatedBytes';
import { compactRoots } from './compactRoots';
import { isMissing } from './isMissing';

// #endregion

export /**
 * Walks the trees iteratively, yielding once per visited entry so callers choose the pacing:
 * inline consumption stays synchronous, budgeted consumption can stop early, and cooperative
 * consumption can hand the event loop back between slices.
 */
function* walkAllocatedBytes(
  paths: readonly string[],
  attribution: ReadonlyMap<string, string> = new Map(),
): Generator<undefined, ISegmentedAllocation> {
  const visited = new Set<string>();
  const bySegment = new Map<string, number>();
  let totalBytes = 0;
  const stack: { readonly path: string; readonly segmentId?: string }[] = compactRoots(paths)
    .filter((root) => existsSync(root))
    .map((path) => ({ path }));
  while (stack.length) {
    const entry = stack.pop() as { readonly path: string; readonly segmentId?: string };
    const path = entry.path;
    let stat: Stats;
    try {
      stat = lstatSync(path);
    } catch (cause) {
      if (isMissing(cause)) continue;
      throw cause;
    }
    if (stat.isSymbolicLink()) continue;
    // Symlinks are not followed and directory hard links are not part of the managed trees, so
    // only multiply-linked files need inode de-duplication. Keeping every ordinary inode in this
    // set made a detail inventory consume hundreds of megabytes on dependency-heavy worktrees.
    if (stat.nlink > 1) {
      const identity = `${stat.dev}:${stat.ino}`;
      if (visited.has(identity)) continue;
      visited.add(identity);
    }
    const segmentId = attribution.get(path) ?? entry.segmentId;
    const bytes = allocatedBytes(stat);
    totalBytes += bytes;
    if (segmentId) bySegment.set(segmentId, (bySegment.get(segmentId) ?? 0) + bytes);
    if (stat.isDirectory()) {
      let entries;
      try {
        entries = readdirSync(path, { withFileTypes: true });
      } catch (cause) {
        if (isMissing(cause)) continue;
        throw cause;
      }
      for (const child of entries) stack.push({ path: resolve(path, child.name), segmentId });
    }
    yield undefined;
  }
  return { totalBytes, bySegment };
}
