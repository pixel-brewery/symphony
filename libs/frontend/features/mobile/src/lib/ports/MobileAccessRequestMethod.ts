// #region Imports

import type { mobileRequestSchemas } from '@symphony/ipc-contracts-mobile';

// #endregion

/**
 * Desktop mobile-access operations consumed by the feature.
 *
 * @public
 */
export type MobileAccessRequestMethod = keyof typeof mobileRequestSchemas;
