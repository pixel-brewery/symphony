// #region Imports

import { z } from 'zod';
import { skillPackageSummarySchema } from './SkillPackageSummarySchema';

// #endregion

/**
 * Validates the available skill packages and their owned roots.
 *
 * @public
 */
export const skillPackageCatalogSchema = z.object({
  sharedRoot: z.string().min(1),
  repositoryRoot: z.string().optional(),
  packages: z.array(skillPackageSummarySchema).readonly(),
});
