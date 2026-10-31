// #region Imports

import { allocatedDirectorySegments } from './allocatedDirectorySegments';

// #endregion

export function allocatedDirectoryBytes(paths: readonly string[]): number {
  return allocatedDirectorySegments(paths).totalBytes;
}
