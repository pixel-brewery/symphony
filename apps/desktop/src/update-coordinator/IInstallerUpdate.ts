/**
 * The verified installer a channel manifest advertises for this runtime target. It stays inside
 * Electron Main: the renderer only ever sees the version through the update state.
 *
 * @public
 */
export interface IInstallerUpdate {
  /**
   * Numeric `major.minor.patch` version the installer delivers.
   *
   * @public
   * @readonly
   */
  readonly version: string;

  /**
   * Credential-free HTTPS location of the installer.
   *
   * @public
   * @readonly
   */
  readonly downloadUrl: string;

  /**
   * Platform installer file name (`.dmg` on macOS, `.exe` on Windows); a single path segment.
   *
   * @public
   * @readonly
   */
  readonly fileName: string;

  /**
   * Exact size of the installer in bytes, as the manifest declares it.
   *
   * @public
   * @readonly
   */
  readonly bytes: number;

  /**
   * Lower-case hexadecimal SHA-256 digest of the installer, as the manifest declares it.
   *
   * @public
   * @readonly
   */
  readonly sha256: string;
}
