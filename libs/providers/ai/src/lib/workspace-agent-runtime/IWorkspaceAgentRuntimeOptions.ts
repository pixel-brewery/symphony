// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IAgentProgress } from '@symphony/application-execution';
import { AgentRouteGovernor } from '@symphony/providers-synapse';
import { AgentRouteAdmission } from '@symphony/providers-synapse';
import { AgentModelLockout } from '@symphony/providers-synapse';
import { AgentAccountCooldowns } from '@symphony/providers-synapse';
import type { IWorkspaceAgentRuntimeTarget } from './IWorkspaceAgentRuntimeTarget';

// #endregion

export interface IWorkspaceAgentRuntimeOptions {
  readonly targets: (
    role: SkillFlowRole,
    workspaceId?: string,
    executionBinding?: IAgentProgress['executionBinding'],
  ) => readonly IWorkspaceAgentRuntimeTarget[];
  readonly governor?: AgentRouteGovernor;
  readonly admission?: AgentRouteAdmission;
  readonly modelLockout?: AgentModelLockout;
  readonly accountCooldowns?: AgentAccountCooldowns;
}
