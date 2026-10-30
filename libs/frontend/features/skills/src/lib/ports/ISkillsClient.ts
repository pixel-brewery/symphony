// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { skillRequestSchemas } from '@symphony/ipc-contracts-skills';

// #endregion

/**
 * Restricts the existing validated desktop client to Skills operations.
 *
 * @public
 */
export interface ISkillsClient {
  /**
   * Invokes an existing Skills method with its canonical payload and result.
   *
   * @public
   */
  request<M extends keyof typeof skillRequestSchemas>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
