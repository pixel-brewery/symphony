// #region Imports

import type { IWorkTrackingProjectionRepository } from '@symphony/application-work';
import type { IPullRequestProjectionRepository } from '@symphony/application-delivery';
import type { IContinuousIntegrationProjectionRepository } from '@symphony/application-ci';

// #endregion

/** Composition of the three feature-owned projection stores in the existing adapter. */
export interface IRemoteProjectionRepository
  extends
    IWorkTrackingProjectionRepository,
    IPullRequestProjectionRepository,
    IContinuousIntegrationProjectionRepository {
  initialize(): void;
  removeWorkspace(workspaceId: string): void;
}
