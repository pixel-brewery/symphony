// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IAgentExecutionTarget } from './IAgentExecutionTarget';
import { agentExecutionTargetsFor } from './agentExecutionTargetsFor';

// #endregion

export function agentExecutionTargetFor(
  settings: IApplicationSettings,
  role: SkillFlowRole,
  workspaceId?: string,
): IAgentExecutionTarget | undefined {
  return agentExecutionTargetsFor(settings, role, workspaceId)[0];
}
