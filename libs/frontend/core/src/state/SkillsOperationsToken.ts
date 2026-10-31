// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISkillsOperations } from './ISkillsOperations';

// #endregion

/**
 * Resolves the feature-owned Skills operations consumed by shared capabilities.
 *
 * @public
 */
export const SKILLS_OPERATIONS = new InjectionToken<ISkillsOperations>('SKILLS_OPERATIONS');
