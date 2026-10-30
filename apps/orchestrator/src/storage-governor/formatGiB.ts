// #region Imports

import { BYTES_PER_GIBIBYTE } from './BytesPerGibibyte';

// #endregion

export function formatGiB(bytes: number): string {
  return `${(bytes / BYTES_PER_GIBIBYTE).toFixed(1)} GB`;
}
