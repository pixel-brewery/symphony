// #region Imports

import type {
  IAgentPhaseAssignment,
  IAgentProfile,
  IAgentTeam,
  IPositionDefinition,
} from '@symphony/domain-team';
import type { IAgentRouteCandidate, IAgentRoutePolicy } from '@symphony/domain-ai';
import type { ProviderConnection } from '../ProviderConnection';

// #endregion

export interface IAgentExecutionTarget {
  readonly team: IAgentTeam;
  readonly assignment: IAgentPhaseAssignment;
  readonly agent: IAgentProfile;
  readonly position: IPositionDefinition;
  readonly routePolicy: IAgentRoutePolicy;
  readonly routeCandidate: IAgentRouteCandidate;
  readonly connection: Extract<ProviderConnection, { kind: 'codex' | 'claude' | 'opencode' }>;
}
