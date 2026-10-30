// #region Imports

import { readLoginShellPath } from './readLoginShellPath';

// #endregion

/**
 * Resolves the login-shell PATH once per orchestrator process. Reading it spawns a shell, so
 * the result is memoised; the cache is encapsulated rather than exported as a mutable binding.
 *
 * @public
 */
export class LoginShellDirectoryCache {
  // #region Fields

  private _directories: readonly string[] | undefined;

  // #endregion

  // #region Methods

  /**
   * Returns the login-shell directories, reading them on first use.
   *
   * @param environment - Environment.
   * @public
   */
  public resolve(environment: NodeJS.ProcessEnv): readonly string[] {
    this._directories ??= readLoginShellPath(environment);
    return this._directories;
  }

  /**
   * Discards the memoised directories so the next resolve reads the login shell again.
   *
   * @public
   */
  public reset(): void {
    this._directories = undefined;
  }

  // #endregion
}
