// #region Imports

import type { IAgentRouteTelemetry } from '@symphony/domain-ai';

// #endregion

export interface IAgentRouteTelemetryRepository {
  initialize(): void;
  load(workspaceId: string, routeCandidateId: string): IAgentRouteTelemetry | undefined;
  save(telemetry: IAgentRouteTelemetry): void;
  removeWorkspace(workspaceId: string): void;
}
