// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';
import { deliveryFlowSteps } from '@symphony/frontend-ui';
import type { BuiltinSkillDto, SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';
import { skillFlowOptions } from '../../view-presenters/skillFlowPresentation/SkillFlowOptions';
import type { ISkillStepView } from './ISkillStepView';

// #endregion

/**
 * Orders the built-in process roles and the attached skill packages by the five delivery-flow
 * steps.
 *
 * @param builtinSkills - The built-in process roles.
 * @param packages - The discovered skill packages.
 * @param assignedSkillId - The package attached to an optional AI step, if any.
 * @returns The five steps in flow order.
 * @public
 */
export function projectSkillSteps(
  builtinSkills: readonly BuiltinSkillDto[],
  packages: readonly SkillPackageCatalogDto['packages'][number][],
  assignedSkillId: (role: SkillFlowRole) => string | undefined,
): readonly ISkillStepView[] {
  return deliveryFlowSteps.map((step) => {
    const roles = step.processRoles.flatMap((role) =>
      builtinSkills.filter((skill) => skill.role === role),
    );
    const attached = step.skillFlowRoles.map((role) => {
      const skillId = assignedSkillId(role);
      return {
        role,
        skill: skillId ? packages.find((candidate) => candidate.id === skillId) : undefined,
      };
    });
    return {
      step,
      roles,
      packages: [...new Set(attached.flatMap((entry) => (entry.skill ? [entry.skill] : [])))],
      openOptions: skillFlowOptions.filter((option) =>
        attached.some((entry) => entry.role === option.role && !entry.skill),
      ),
    };
  });
}
