// #region Imports

import type { IWorkTrackingProjectionScope } from '@symphony/application-work';
import type { IPullRequestProjectionScope } from '@symphony/application-delivery';
import type { IContinuousIntegrationProjectionScope } from '@symphony/application-ci';

// #endregion

export interface IRemoteProjectionScope
  extends
    IWorkTrackingProjectionScope,
    IPullRequestProjectionScope,
    IContinuousIntegrationProjectionScope {}
