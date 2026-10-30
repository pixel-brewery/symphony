// #region Imports

import type { IAgentAccountCooldown } from '@symphony/domain-ai';

// #endregion

export interface IAgentAccountCooldownRepository {
  loadAccountCooldown(
    workspaceId: string,
    aiConnectionId: string,
  ): IAgentAccountCooldown | undefined;
  saveAccountCooldown(cooldown: IAgentAccountCooldown): void;
  clearAccountCooldown(workspaceId: string, aiConnectionId: string): void;
  clearWorkspaceAccountCooldowns(workspaceId: string): void;
}
