// #region Imports

import type { ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** Applies the validated account result to the existing shared settings projection. @public */
export interface IWorkConnectionProjection {
  applyProviderConnections(connections: ResponsePayload<'connections.get'>): void;
}
