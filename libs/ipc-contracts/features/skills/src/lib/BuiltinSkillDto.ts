// #region Imports

import { z } from 'zod';
import { builtinSkillSchema } from './BuiltinSkillSchema';

// #endregion

/**
 * Describes a validated built-in process role.
 *
 * @public
 */
export type BuiltinSkillDto = z.infer<typeof builtinSkillSchema>;
