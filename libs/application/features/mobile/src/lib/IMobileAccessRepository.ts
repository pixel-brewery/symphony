// #region Imports

import { type PersistedMobileAccess } from '@symphony/mobile-contracts';

// #endregion

/**
 * Persists the validated, versioned mobile-access settings and paired-device records.
 *
 * @public
 */
export interface IMobileAccessRepository {
  load(): PersistedMobileAccess;
  save(settings: PersistedMobileAccess): PersistedMobileAccess;
}
