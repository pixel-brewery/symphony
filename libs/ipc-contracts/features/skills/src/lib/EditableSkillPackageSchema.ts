// #region Imports

import { z } from 'zod';
import { skillPackageFileSchema } from './SkillPackageFileSchema';

// #endregion

/**
 * Validates bounded editable skill content before persistence.
 *
 * @public
 */
export const editableSkillPackageSchema = z.object({
  originalName: z.string().optional(),
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(2_000),
  instructions: z.string().min(1).max(500_000),
  openaiYaml: z.string().max(100_000),
  files: z.array(skillPackageFileSchema).max(250).readonly(),
});
