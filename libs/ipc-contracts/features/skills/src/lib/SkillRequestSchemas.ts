// #region Imports

import { processRoles } from '@symphony/domain-workflow';
import { z } from 'zod';
import { editableSkillPackageSchema } from './EditableSkillPackageSchema';

// #endregion

/**
 * Owns the existing validated request payloads for skill package operations.
 *
 * @public
 */
export const skillRequestSchemas = {
  'skills.list': z.object({}),
  'skills.builtin.list': z.object({}),
  'skills.builtin.customize': z.object({
    role: z.enum(processRoles),
    additionalInstructions: z.string().max(20_000),
  }),
  'skills.get': z.object({ id: z.string().min(1) }),
  'skills.save': z.object({ skill: editableSkillPackageSchema }),
  'skills.import': z.object({ sourcePath: z.string().min(1) }),
  'skills.export': z.object({ id: z.string().min(1), destinationRoot: z.string().min(1) }),
  'skills.delete': z.object({ name: z.string().min(1).max(64) }),
} as const;
