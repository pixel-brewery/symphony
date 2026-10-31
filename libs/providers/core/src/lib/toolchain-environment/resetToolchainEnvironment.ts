// #region Imports

import { loginShellDirectories } from './LoginShellDirectories';

// #endregion

/**
 * Test seam. Production resolves the login shell once per orchestrator process.
 *
 * @public
 */
export function resetToolchainEnvironment(): void {
  loginShellDirectories.reset();
}
