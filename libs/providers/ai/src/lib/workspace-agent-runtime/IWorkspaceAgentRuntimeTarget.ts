// #region Imports

import type { IAgentRouteDescriptor } from '@symphony/providers-synapse';
import type { IAgentProgress, IAgentRuntimePort } from '@symphony/application-execution';
import type { IIssueDraftingPort } from '@symphony/application-work';
import type { IAgentModelTarget } from '@symphony/providers-synapse';

// #endregion

export interface IWorkspaceAgentRuntimeTarget extends IAgentRouteDescriptor {
  readonly label: string;
  /** Runtime name the run stream attributes this route's events to. */
  readonly actor: string;
  readonly runtime: IAgentRuntimePort & IIssueDraftingPort;
  readonly executionBinding: NonNullable<IAgentProgress['executionBinding']>;
  readonly inspectModelAvailability?: IAgentModelTarget['inspectModelAvailability'];
}
