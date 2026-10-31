// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Restricts the validated desktop client to CI, local-runner and storage refresh operations.
 *
 * @public
 */
export interface ICiClient {
  /**
   * Executes a consumed desktop method with its canonical validated request and response.
   *
   * @public
   */
  request<
    M extends
      | 'ci.approval.review'
      | 'ci.cancel'
      | 'ci.usage.get'
      | 'ci.local.cancel'
      | 'ci.local.cleanup'
      | 'ci.local.run'
      | 'ci.rerun'
      | 'ci.run.details'
      | 'ci.run.log'
      | 'ci.runs.refresh'
      | 'ci.workflow.dispatch'
      | 'ci.workflow.local.run'
      | 'local-ci.image.select'
      | 'local-ci.images.list'
      | 'local-ci.instances.list'
      | 'local-ci.instances.remove'
      | 'storage.status.get',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
