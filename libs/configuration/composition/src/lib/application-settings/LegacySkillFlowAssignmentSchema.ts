// #region Imports

import { z } from 'zod';
import { skillFlowRoles } from '@symphony/domain-skills';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const legacySkillFlowAssignmentSchema = z.object({
  role: z.enum(skillFlowRoles),
  skillId: identifierSchema,
});
