// #region Imports
import type { SkillTextDigest } from '../SkillTextDigest';
import type { ISkillPackageDocument } from '../ISkillPackageDocument';
import type { ISkillCustomizationSetting } from '../ISkillCustomizationSetting';
import type { SkillFlowRole } from '../SkillFlowRole';
import type { ProcessRole } from '@symphony/domain-workflow';
import { resolveBuiltinSkill } from './resolveBuiltinSkill';

// #endregion

/** Projects shipped role code into the existing execution snapshot contract; never writes an importable package. @public */
export function builtinSkillPackage(
  role: SkillFlowRole,
  customizations: readonly ISkillCustomizationSetting[],
  resolvedAt: string,
  digest: SkillTextDigest,
): ISkillPackageDocument {
  const roles: Record<SkillFlowRole, ProcessRole> = {
    'work-item-creation': 'create',
    analysis: 'analyze',
    solution: 'solve',
    'ci-diagnosis': 'ci-diagnosis',
    'ci-repair': 'ci-repair',
    'pull-request-review': 'pull-request-review',
  };
  const definition = resolveBuiltinSkill(
    roles[role],
    customizations.find((item) => item.role === roles[role]),
    digest,
  );
  return {
    id: `bundled:${role}`,
    name: role,
    displayName: definition.displayName,
    description: definition.description,
    source: 'bundled',
    location: `bundled:${roles[role]}`,
    editable: false,
    implicitInvocation: false,
    updatedAt: resolvedAt,
    digest: digest(definition.instructions),
    resourceCount: 0,
    warnings: [],
    instructions: definition.instructions,
    openaiYaml: '',
    files: [],
  };
}
