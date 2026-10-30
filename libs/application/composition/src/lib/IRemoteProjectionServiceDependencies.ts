// #region Imports

import type { WorkTrackingProjectionService } from '@symphony/application-work';
import type { PullRequestProjectionService } from '@symphony/application-delivery';
import type { ContinuousIntegrationProjectionService } from '@symphony/application-ci';

// #endregion

/** Composition depends only on the feature-owned query methods it calls. */
export interface IRemoteProjectionServiceDependencies {
  readonly workTracking: Pick<
    WorkTrackingProjectionService,
    'loadProjection' | 'loadOperationalWorkItems' | 'loadWorkItemDetails' | 'recordWorkItem'
  >;
  readonly pullRequests: Pick<PullRequestProjectionService, 'loadProjection'>;
  readonly continuousIntegration: Pick<
    ContinuousIntegrationProjectionService,
    'loadProjection' | 'refresh'
  >;
  readonly includePullRequestStatus: boolean;
  readonly includeContinuousIntegrationStatus: boolean;
}
