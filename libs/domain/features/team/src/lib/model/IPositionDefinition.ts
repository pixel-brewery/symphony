// #region Imports

import type { AgentAuthorityMode } from './AgentAuthorityMode';
import type { AgentCapability } from '@symphony/domain-ai';
import type { SkillFlowRole } from '@symphony/domain-skills';

// #endregion

export interface IPositionDefinition {
  id: string;
  workspaceId: string;
  displayName: string;
  description: string;
  responsibilities: readonly string[];
  allowedRoles: readonly SkillFlowRole[];
  authority: AgentAuthorityMode;
  requiredCapabilities?: readonly AgentCapability[];
  allowedPathPatterns?: readonly string[];
  forbiddenPathPatterns?: readonly string[];
  maximumChangedFiles?: number;
  maximumDiffLines?: number;
  maximumIterations?: number;
}
