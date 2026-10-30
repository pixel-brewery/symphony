// #region Imports

import { z } from 'zod';
import { skillPackageFileSchema } from './SkillPackageFileSchema';
import { skillPackageSummarySchema } from './SkillPackageSummarySchema';

// #endregion

/**
 * Validates complete skill package content returned by the application.
 *
 * @public
 */
export const skillPackageDocumentSchema = skillPackageSummarySchema.extend({
  instructions: z.string(),
  openaiYaml: z.string(),
  files: z.array(skillPackageFileSchema).max(250).readonly(),
});
