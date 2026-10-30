// #region Imports

import type { PersistedMobileAccess } from './PersistedMobileAccess';

// #endregion

export const defaultPersistedMobileAccess = {
  version: 1,
  enabled: false,
  devices: [],
} as const satisfies PersistedMobileAccess;
