// #region Imports

import type { IContinuousIntegrationProjection } from '@symphony/domain-ci';

// #endregion

/** Durable CI workflow and run reads for one selected binding scope. */
export interface IContinuousIntegrationProjectionRepository {
  loadContinuousIntegration(scope: string): IContinuousIntegrationProjection | undefined;
  saveContinuousIntegration(scope: string, projection: IContinuousIntegrationProjection): void;
}
