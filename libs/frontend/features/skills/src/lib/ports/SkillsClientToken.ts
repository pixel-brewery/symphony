// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISkillsClient } from './ISkillsClient';

// #endregion

/**
 * Resolves the Skills-only view of the existing desktop transport.
 *
 * @public
 */
export const SKILLS_CLIENT = new InjectionToken<ISkillsClient>('SKILLS_CLIENT');
