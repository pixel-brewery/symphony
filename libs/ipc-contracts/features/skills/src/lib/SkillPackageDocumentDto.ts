// #region Imports

import { z } from 'zod';
import { skillPackageDocumentSchema } from './SkillPackageDocumentSchema';

// #endregion

/**
 * Describes a validated complete skill package document.
 *
 * @public
 */
export type SkillPackageDocumentDto = z.infer<typeof skillPackageDocumentSchema>;
