// #region Imports

import type { ProcessRunnerBase } from '@pixel-brewery/synapse-runtime';

// #endregion

/**
 * Explicit orchestration-process composition of the shared native AI service.
 *
 * @public
 */
export interface ISynapseAiServiceOptions {
  /**
   * Private profile manager base; individual native accounts retain explicit legacy roots.
   */
  readonly profileStoreRoot: string;

  /**
   * Optional external-process boundary for deterministic integration tests.
   */
  readonly runner?: ProcessRunnerBase;

  /**
   * Explicit bootstrap environment, e.g. approved executable PATH and shared package caches.
   */
  readonly environment?: Readonly<Record<string, string>>;
}
