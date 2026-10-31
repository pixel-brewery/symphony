// #region Imports

import type { AgentModelAvailability } from './AgentModelAvailability';

// #endregion

export interface IAgentModelTarget {
  readonly workspaceId: string;
  readonly aiConnectionId: string;
  readonly model: string | null;
  readonly inspectModelAvailability?: (
    model: string,
    signal: AbortSignal,
  ) => Promise<AgentModelAvailability>;
}
