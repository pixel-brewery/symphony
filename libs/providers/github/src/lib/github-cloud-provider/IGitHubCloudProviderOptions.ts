// #region Imports

import type { IApplicationSettings, ProviderConnection } from '@symphony/configuration-composition';
import type { ILocalCiHostCapacity } from '@symphony/domain-ci';
import type { IRunnerImageDefinition } from '@symphony/domain-core';
import { GitHubRequestGovernor } from '../github-request-governor';
import type { IGithubLocalRunner } from '@symphony/providers-lima';

// #endregion

export interface IGitHubCloudProviderOptions {
  readonly settings: () => IApplicationSettings;
  readonly token?: (
    connection: Extract<ProviderConnection, { kind: 'github' }>,
  ) => Promise<string | undefined>;
  readonly execute?: (
    command: string,
    arguments_: readonly string[],
    environment?: NodeJS.ProcessEnv,
  ) => Promise<string>;
  readonly now?: () => Date;
  readonly governor?: GitHubRequestGovernor;
  readonly localRunner?: IGithubLocalRunner;
  readonly localRunnerPollMilliseconds?: number;
  readonly localCiHostCapacity?: (runtimeRoot: string) => ILocalCiHostCapacity;
  /**
   * Resolves the configured guest image and repository setup script for one repository binding.
   * The guest contents are installation configuration, never provider source.
   */
  readonly localCiGuest?: (
    repositoryBindingId: string,
    signal: AbortSignal,
  ) => Promise<{
    readonly image: IRunnerImageDefinition;
    readonly setupScript?: string;
    readonly reuse?: boolean;
    readonly warmInstanceKey?: string;
  }>;
}
