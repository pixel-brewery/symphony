// #region Imports
import { InjectionToken } from '@angular/core';
import type { IApplicationBootstrapSkills } from './IApplicationBootstrapSkills';
// #endregion

/**
 * Connects the optional Skills startup participant to the application bootstrap.
 *
 * @public
 */
export const APPLICATION_BOOTSTRAP_SKILLS = new InjectionToken<IApplicationBootstrapSkills>(
  'symphony.application-bootstrap.skills',
);
