// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { IPullRequestCollectionPort } from './ports/IPullRequestCollectionPort';
import type { IPullRequestProjectionRepository } from './ports/IPullRequestProjectionRepository';
import type { IPullRequestProjectionScope } from './IPullRequestProjectionScope';

// #endregion

/** Dependencies of the delivery-owned remote read model. */
export interface IPullRequestProjectionDependencies {
  readonly pullRequests?: IPullRequestCollectionPort;
  readonly repository?: IPullRequestProjectionRepository;
  readonly clock: IPlatformClock;
  readonly scope?: () => IPullRequestProjectionScope;
  readonly maxAgeMilliseconds?: () => number;
  readonly reportReadFailure?: (
    projection: 'pull-requests',
    cause: unknown,
    cached: boolean,
  ) => void;
  readonly reportPersistenceFailure?: (
    projection: 'pull-requests',
    operation: 'load' | 'save',
    cause: unknown,
  ) => void;
}
