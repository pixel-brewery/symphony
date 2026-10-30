// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';
import type { ISkillFlowOption } from './ISkillFlowOption';
import { skillFlowOptions } from './SkillFlowOptions';

// #endregion

export function skillFlowOption(role: SkillFlowRole | undefined): ISkillFlowOption | undefined {
  return skillFlowOptions.find((option) => option.role === role);
}
