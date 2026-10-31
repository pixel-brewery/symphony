// #region Imports

import { LoginShellDirectoryCache } from './LoginShellDirectoryCache';

// #endregion

/**
 * Process-wide login-shell directory cache shared by toolchain resolution and its test seam.
 *
 * @public
 */
export const loginShellDirectories = new LoginShellDirectoryCache();
