// #region Imports

import type { ISegmentDefinition } from './ISegmentDefinition';
import type { StoragePressure } from './StoragePressure';

// #endregion

export interface IUsageGroup {
  readonly id: string;
  readonly label: string;
  readonly paths: readonly string[];
  readonly limitBytes: number;
  readonly minimumPressure?: StoragePressure;
  readonly workspaceId?: string;
  readonly segments: readonly ISegmentDefinition[];
  /** Set on the one group whose roots span the walk, so its total is the walk total. */
  readonly spansEverything?: boolean;
}
