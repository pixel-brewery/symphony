// #region Imports

import type { RunnerImageArchitecture } from './RunnerImageArchitecture';

// #endregion

/**
 * A resolved, reproducible guest image definition. Everything here is derived from a selected
 * runner image release and pinned, so a later upstream change cannot silently alter a run.
 */
export interface IRunnerImageDefinition {
  readonly releaseTag: string;
  readonly architecture: RunnerImageArchitecture;
  readonly ubuntuVersion: string;
  readonly ubuntuCodename: string;
  /** Cloud-image release directory, for example `20260725`. */
  readonly cloudImageRelease: string;
  readonly cloudImageFile: string;
  readonly cloudImageSha256: string;
  /** Apt packages the selected runner image declares. */
  readonly aptPackages: readonly string[];
  readonly nodeVersion: string;
  readonly nodeArchive: string;
  readonly nodeSha256: string;
  /** Environment variables the selected runner image exports to every job. */
  readonly environment: Readonly<Record<string, string>>;
  readonly resolvedAt: string;
}
