// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';

// #endregion

export interface ISkillFlowOption {
  readonly role: SkillFlowRole;
  readonly label: string;
  readonly placement: string;
}
