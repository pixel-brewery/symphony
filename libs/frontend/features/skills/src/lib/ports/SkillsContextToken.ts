// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISkillsContext } from './ISkillsContext';

// #endregion

/**
 * Resolves the read-only context consumed by Skills.
 *
 * @public
 */
export const SKILLS_CONTEXT = new InjectionToken<ISkillsContext>('SKILLS_CONTEXT');
