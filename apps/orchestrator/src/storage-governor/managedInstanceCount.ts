// #region Imports

import { readdirSync } from 'node:fs';
import { isManagedInstanceName } from '@symphony/providers-lima';

// #endregion

export function managedInstanceCount(limaRoot: string): number {
  try {
    return readdirSync(limaRoot, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory() && isManagedInstanceName(entry.name),
    ).length;
  } catch {
    return 0;
  }
}
