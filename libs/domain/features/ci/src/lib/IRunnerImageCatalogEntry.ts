// #region Imports

import type { RunnerImageArchitecture } from '@symphony/domain-core';
import type { RunnerImageFamily } from './RunnerImageFamily';

// #endregion

/** One selectable GitHub-hosted runner image release. */
export interface IRunnerImageCatalogEntry {
  /** GitHub release tag, for example `ubuntu24-arm64/20260817.96`. */
  readonly releaseTag: string;
  readonly family: RunnerImageFamily;
  readonly architecture: RunnerImageArchitecture;
  readonly ubuntuVersion: string;
  readonly imageVersion: string;
  readonly publishedAt: string;
  /** URL of the machine-readable software report published with the release. */
  readonly reportUrl: string;
  /** True for the newest release of its family and architecture. */
  readonly latest: boolean;
}
