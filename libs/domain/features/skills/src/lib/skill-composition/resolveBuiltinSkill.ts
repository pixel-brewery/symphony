// #region Imports
import type { SkillTextDigest } from '../SkillTextDigest';
import type { IResolvedSkill, ProcessRole } from '@symphony/domain-workflow';
import { builtinSkill } from '../builtin-skills';
import type { ISkillCustomization } from './ISkillCustomization';
import { composeSkillInstructions } from './composeSkillInstructions';

// #endregion

/** Resolves the effective definition of one role for an execution or an agent adapter. */
export function resolveBuiltinSkill(
  role: ProcessRole,
  customization: ISkillCustomization | undefined,
  digest: SkillTextDigest,
): IResolvedSkill {
  const skill = builtinSkill(role);
  const composed = composeSkillInstructions(skill, customization, digest);
  return {
    role: skill.role,
    displayName: skill.displayName,
    description: skill.description,
    version: composed.version,
    promptVersion: composed.promptVersion,
    instructions: composed.instructions,
    customizationHash: composed.customizationHash,
    mutatesWorkspace: skill.mutatesWorkspace,
    publishesPullRequest: skill.publishesPullRequest,
  };
}
