// #region Imports

import type { IAgentProfile } from '@symphony/domain-team';
import type { IApplicationSettings } from '../IApplicationSettings';
import type { SkillFlowRole } from '@symphony/domain-skills';
import { agentExecutionTargetFor } from './agentExecutionTargetFor';

// #endregion

export function agentProfileFor(
  settings: IApplicationSettings,
  workspaceId?: string,
  role: SkillFlowRole = 'analysis',
): IAgentProfile | undefined {
  return agentExecutionTargetFor(settings, role, workspaceId)?.agent;
}
