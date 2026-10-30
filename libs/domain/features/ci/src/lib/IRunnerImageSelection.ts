// #region Imports

import type { IRunnerImageDefinition } from '@symphony/domain-core';

// #endregion

export interface IRunnerImageSelection {
  readonly releaseTag: string;
  /** Pinned definition resolved from the selected release. */
  readonly definition: IRunnerImageDefinition;
}
