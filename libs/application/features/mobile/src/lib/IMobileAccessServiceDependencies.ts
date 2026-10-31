// #region Imports

import type { IMobileAccessRepository } from './IMobileAccessRepository';
import type { IMobileAccessSecurity } from './IMobileAccessSecurity';

// #endregion

/**
 * Supplies persistence, token operations and the clock used by mobile-access lifecycle policy.
 *
 * @public
 */
export interface IMobileAccessServiceDependencies {
  repository: IMobileAccessRepository;
  security: IMobileAccessSecurity;
  now: () => Date;
}
