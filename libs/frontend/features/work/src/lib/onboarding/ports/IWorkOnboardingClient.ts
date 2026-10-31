// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Native inspection requests consumed by the onboarding proposal workflow.
 *
 * @public
 */
export interface IWorkOnboardingClient {
  request<
    M extends
      | 'connections.get'
      | 'setup.repository.inspect'
      | 'github.projects.list'
      | 'runtime-dependencies.install',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
