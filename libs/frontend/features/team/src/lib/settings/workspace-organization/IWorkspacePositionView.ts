// #region Imports

import type { Settings } from './Settings';
import type { SkillFlowRole } from './SkillFlowRole';

// #endregion

export interface IWorkspacePositionView {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly authority: Settings['positions'][number]['authority'];
  readonly allowedRoles: readonly SkillFlowRole[];
  readonly responsibilities: readonly string[];
}
