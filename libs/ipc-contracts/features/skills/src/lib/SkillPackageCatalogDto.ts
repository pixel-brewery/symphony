// #region Imports

import { z } from 'zod';
import { skillPackageCatalogSchema } from './SkillPackageCatalogSchema';

// #endregion

/**
 * Describes a validated skill package catalog.
 *
 * @public
 */
export type SkillPackageCatalogDto = z.infer<typeof skillPackageCatalogSchema>;
