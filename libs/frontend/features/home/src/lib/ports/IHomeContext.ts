// #region Imports

import type { Signal } from '@angular/core';
import type { IExternalServiceIncident } from '@symphony/domain-platform';

// #endregion

/** The two shared projections consumed by the overview page. @public */
export interface IHomeContext {
  /** Whether the first validated snapshot has arrived. @public @readonly */
  readonly hasSnapshot: Signal<boolean>;
  /** First confirmed upstream incident relevant to this page. @public @readonly */
  readonly externalServiceIncident: Signal<IExternalServiceIncident | undefined>;
}
