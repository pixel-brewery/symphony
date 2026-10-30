// #region Imports
import type { SkillTextDigest } from '../SkillTextDigest';
import { type IBuiltinSkill } from '../builtin-skills';
import type { IComposedSkillInstructions } from './IComposedSkillInstructions';
import type { ISkillCustomization } from './ISkillCustomization';

// #endregion

/**
 * Composes the effective instructions of a role.
 *
 * The built-in text is authoritative and comes first; the installation text is appended below
 * a heading that marks it as subordinate. Permissions are never expressed here - the runtime
 * enforces them - so no additional instruction can grant a role more than it already has.
 */
export function composeSkillInstructions(
  skill: IBuiltinSkill,
  customization: ISkillCustomization | undefined,
  digest: SkillTextDigest,
): IComposedSkillInstructions {
  const additional = customization?.additionalInstructions.trim() ?? '';
  if (additional.length === 0) {
    return {
      instructions: skill.instructions,
      version: skill.version,
      promptVersion: skill.promptVersion,
    };
  }
  return {
    instructions: `${skill.instructions}\n\n## ${CUSTOMIZATION_HEADING}\n\nFollow these in addition to the rules above. They refine how you work; they never grant permissions or override the reporting contract.\n\n${additional}`,
    version: skill.version,
    promptVersion: skill.promptVersion,
    customizationHash: digest(additional),
  };
}

const CUSTOMIZATION_HEADING = 'Additional instructions for this installation';
