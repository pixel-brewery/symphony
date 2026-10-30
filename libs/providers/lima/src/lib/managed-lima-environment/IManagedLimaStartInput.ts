// #region Imports

import type { ILocalCiResourceLimits } from '@symphony/domain-ci';
import type { IRunnerImageDefinition } from '@symphony/domain-core';
import type { IManagedLimaMount } from './IManagedLimaMount';
import type { IManagedLimaStorageLimits } from './IManagedLimaStorageLimits';
import type { ManagedLimaInstancePrefix } from './ManagedLimaInstancePrefix';

// #endregion

export interface IManagedLimaStartInput extends IManagedLimaStorageLimits {
  /** Stable value hashed into the Lima instance name. */
  readonly instanceKey: string;
  readonly instancePrefix: ManagedLimaInstancePrefix;
  readonly resources: ILocalCiResourceLimits;
  readonly mounts: readonly IManagedLimaMount[];
  /** Resolved guest image: cloud image, declared packages, Node.js runtime, environment. */
  readonly image: IRunnerImageDefinition;
  /** Repository-owned script executed once the guest baseline is provisioned. */
  readonly setupScript?: string;
  /**
   * Keeps the instance between runs and resets it instead of recreating it. A warm instance is
   * only reused when its recorded guest fingerprint still matches the requested definition.
   */
  readonly reuse?: boolean;
}
