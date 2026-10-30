// #region Imports

import type { IExecutionLifecycle } from '../lifecycle/IExecutionLifecycle';
import type { IExecutionAdmission } from '../admission/IExecutionAdmission';
import type { IExecutionGoals } from '../goals/IExecutionGoals';
import type { IDeliveryGroups } from '../groups/IDeliveryGroups';
import type { IExecutionWorkspaces } from '../workspace/IExecutionWorkspaces';
import type { IExecutionStarts } from '../starting/IExecutionStarts';
import type { IManualExecutions } from '../manual/IManualExecutions';
import type { IExecutionRuns } from '../run/IExecutionRuns';
import type { IExecutionClaims } from '../claims/IExecutionClaims';
import type { IExecutionPublication } from '../publication/IExecutionPublication';
import type { IExecutionWorkflow } from '../workflow/IExecutionWorkflow';
import type { IExecutionEvents } from '../events/IExecutionEvents';

// #endregion

/** Typed owners composed for a single execution session. @public */
export interface IExecutionServices {
  readonly lifecycle: IExecutionLifecycle;
  readonly admission: IExecutionAdmission;
  readonly goals: IExecutionGoals;
  readonly groups: IDeliveryGroups;
  readonly workspace: IExecutionWorkspaces;
  readonly starting: IExecutionStarts;
  readonly manual: IManualExecutions;
  readonly run: IExecutionRuns;
  readonly claims: IExecutionClaims;
  readonly publication: IExecutionPublication;
  readonly workflow: IExecutionWorkflow;
  readonly events: IExecutionEvents;
}
