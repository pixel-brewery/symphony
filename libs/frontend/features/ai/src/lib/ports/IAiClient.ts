// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Validated account, model and usage operations consumed by the AI feature.
 *
 * @public
 */
export interface IAiClient {
  /**
   * Invokes only the AI operations owned by this feature.
   *
   * @public
   */
  request<
    M extends
      | 'codex.configuration.get'
      | 'ai.models.get'
      | 'ai.intelligence.get'
      | 'codex.login.start'
      | 'codex.logout'
      | 'claude.login.start'
      | 'claude.login.complete'
      | 'claude.logout'
      | 'opencode.credentials.import',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
