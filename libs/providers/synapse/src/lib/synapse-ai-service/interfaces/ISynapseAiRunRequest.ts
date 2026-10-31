// #region Imports

import type { IAiRequest } from '@pixel-brewery/synapse-core';

// #endregion

/**
 * Host business request whose native account/session identity is supplied by the shared bridge.
 *
 * @public
 */
export interface ISynapseAiRunRequest extends Omit<IAiRequest, 'target' | 'session'> {
  /**
   * Existing route candidate identity used to bind continuation affinity.
   */
  readonly candidateId?: string;

  /**
   * Existing opaque native continuation, already affinity-checked by WorkspaceAgentRuntime.
   */
  readonly continuationReference?: string;

  /**
   * Host issue-draft operation identity used only for bounded transient native continuation recovery.
   */
  readonly sessionKey?: string;
}
