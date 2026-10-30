// #region Imports

import type { IAiResult } from '@pixel-brewery/synapse-core';
import type { ISynapseAiRunRequest } from '../../synapse-ai-service/interfaces/ISynapseAiRunRequest.js';

// #endregion

/**
 * Symphony business projection composed with the long-lived native AI bridge.
 *
 * @public
 */
export interface ISynapseAgentRuntimeOptions {
  /**
   * Provider/actor label used in existing execution progress.
   */
  readonly actor: string;

  /**
   * Executes one request through the shared profile, auth and runtime owner.
   *
   * @param request - Business prompt, policy, continuation and critical progress callback.
   * @returns The same invocation's final result after owned process cleanup.
   */
  readonly execute: (request: ISynapseAiRunRequest) => Promise<IAiResult>;

  /**
   * Model selected by Symphony's catalog and route policy.
   */
  readonly model?: string;

  /**
   * Model-supported native reasoning option selected by Symphony.
   */
  readonly reasoningEffort?: string;

  /**
   * Host delivery deny rules, provided only when the selected driver can enforce them.
   */
  readonly deniedTools?: readonly string[];
}
