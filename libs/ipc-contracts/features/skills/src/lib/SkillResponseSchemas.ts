// #region Imports

import { applicationSettingsSchema } from '@symphony/configuration-composition';
import { z } from 'zod';
import { builtinSkillSchema } from './BuiltinSkillSchema';
import { skillOperationSchema } from './SkillOperationSchema';
import { skillPackageCatalogSchema } from './SkillPackageCatalogSchema';
import { skillPackageDocumentSchema } from './SkillPackageDocumentSchema';

// #endregion

/**
 * Owns the unchanged skill responses composed into the desktop contract.
 *
 * @public
 */
export const skillResponseSchemas = {
  'skills.list': skillPackageCatalogSchema,
  'skills.builtin.list': z.object({ skills: z.array(builtinSkillSchema).readonly() }),
  'skills.builtin.customize': applicationSettingsSchema,
  'skills.get': skillPackageDocumentSchema,
  'skills.save': skillPackageDocumentSchema,
  'skills.import': skillPackageDocumentSchema,
  'skills.export': skillOperationSchema,
  'skills.delete': skillOperationSchema,
} as const;
