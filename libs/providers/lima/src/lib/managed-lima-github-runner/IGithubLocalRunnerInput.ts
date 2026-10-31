// #region Imports

import type { ILocalCiResourceLimits } from '@symphony/domain-ci';
import type { IRunnerImageDefinition } from '@symphony/domain-core';

// #endregion

export interface IGithubLocalRunnerInput {
  readonly repositoryUrl: string;
  readonly registrationToken: string;
  readonly runnerName: string;
  readonly labels: readonly string[];
  readonly runtimeRoot: string;
  readonly resources: ILocalCiResourceLimits;
  readonly storageLimitGiB: number;
  readonly minimumFreeDiskGiB: number;
  /** Guest image selected for this workspace. */
  readonly image: IRunnerImageDefinition;
  /** Repository-owned provisioning script executed before the runner registers. */
  readonly setupScript?: string;
  /** Reuses one warm instance under `warmInstanceKey` instead of creating a new one. */
  readonly reuse?: boolean;
  readonly warmInstanceKey?: string;
}
