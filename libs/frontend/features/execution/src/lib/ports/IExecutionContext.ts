// #region Imports

import type { Signal } from '@angular/core';
import type { IExecutionProjectionValue } from '@symphony/frontend-core/execution';
import type { IAgentProfile } from '@symphony/domain-team';

// #endregion

/** Read-only projections consumed by Execution surfaces. @public */
export interface IExecutionContext {
  readonly projection: Signal<IExecutionProjectionValue | undefined>;
  readonly agentProfiles: Signal<readonly IAgentProfile[]>;
}
