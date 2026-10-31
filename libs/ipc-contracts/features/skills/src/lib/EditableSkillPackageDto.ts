// #region Imports

import { z } from 'zod';
import { editableSkillPackageSchema } from './EditableSkillPackageSchema';

// #endregion

/**
 * Describes the validated editable content of a skill package.
 *
 * @public
 */
export type EditableSkillPackageDto = z.infer<typeof editableSkillPackageSchema>;
