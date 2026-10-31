// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { IWorkTrackingProjectionPort } from './IWorkTrackingProjectionPort';
import type { IWorkTrackingProjectionRepository } from './IWorkTrackingProjectionRepository';
import type { IWorkTrackingProjectionScope } from './IWorkTrackingProjectionScope';

// #endregion

/** Dependencies of the work-owned remote read model. */
export interface IWorkTrackingProjectionDependencies {
  readonly tracker: IWorkTrackingProjectionPort;
  readonly repository?: IWorkTrackingProjectionRepository;
  readonly clock: IPlatformClock;
  readonly scope?: () => IWorkTrackingProjectionScope;
  readonly maxAgeMilliseconds?: () => number;
  readonly reportReadFailure?: (projection: 'work-items', cause: unknown, cached: boolean) => void;
  readonly reportPersistenceFailure?: (
    projection: 'work-items',
    operation: 'load' | 'save',
    cause: unknown,
  ) => void;
}
