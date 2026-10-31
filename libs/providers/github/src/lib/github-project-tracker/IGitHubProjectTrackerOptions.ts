// #region Imports

import { type IApplicationSettings } from '@symphony/configuration-composition';
import { GitHubRequestGovernor, type IGitHubRateLimitSnapshot } from '../github-request-governor';
import type { GitHubCommandRunner } from './GitHubCommandRunner';
import type { GitHubConnection } from './GitHubConnection';

// #endregion

export interface IGitHubProjectTrackerOptions {
  readonly settings: () => IApplicationSettings;
  readonly token?: (connection: GitHubConnection) => Promise<string | undefined>;
  readonly runCommand?: GitHubCommandRunner;
  readonly governor?: GitHubRequestGovernor;
  readonly observeRateLimit?: (snapshot: IGitHubRateLimitSnapshot) => void;
  readonly now?: () => string;
  /** Lease length written into shared claims; comes from the configured claim policy. */
  readonly claimLeaseMinutes?: () => number;
  /** Cadence the caller renews claims at; decides how early a lease has to be extended. */
  readonly claimHeartbeatSeconds?: () => number;
}
