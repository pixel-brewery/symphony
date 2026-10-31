// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { IContinuousIntegrationPort } from './ports/IContinuousIntegrationPort';
import type { IContinuousIntegrationProjectionRepository } from './ports/IContinuousIntegrationProjectionRepository';
import type { IContinuousIntegrationProjectionScope } from './IContinuousIntegrationProjectionScope';

// #endregion

/** Dependencies of the ci-owned remote read model. */
export interface IContinuousIntegrationProjectionDependencies {
  readonly ci?: IContinuousIntegrationPort;
  readonly repository?: IContinuousIntegrationProjectionRepository;
  readonly clock: IPlatformClock;
  readonly scope?: () => IContinuousIntegrationProjectionScope;
  readonly maxAgeMilliseconds?: () => number;
  readonly reportReadFailure?: (projection: 'ci-runs', cause: unknown, cached: boolean) => void;
  readonly reportPersistenceFailure?: (
    projection: 'ci-runs',
    operation: 'load' | 'save',
    cause: unknown,
  ) => void;
}
