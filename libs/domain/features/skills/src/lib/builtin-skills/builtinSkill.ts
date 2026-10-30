// #region Imports

import type { ProcessRole } from '@symphony/domain-workflow';
import type { IBuiltinSkill } from './IBuiltinSkill';
import { builtinSkills } from './BuiltinSkills';

// #endregion

export function builtinSkill(role: ProcessRole): IBuiltinSkill {
  const skill = builtinSkills.find((candidate) => candidate.role === role);
  if (!skill) throw new Error(`No built-in skill is registered for the "${role}" role.`);
  return skill;
}
