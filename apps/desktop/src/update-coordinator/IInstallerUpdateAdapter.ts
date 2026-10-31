// #region Imports

import type { IInstallerUpdate } from './IInstallerUpdate';

// #endregion

/**
 * Reads, downloads and opens installer-only updates without exposing their URL to the renderer.
 *
 * @public
 */
export interface IInstallerUpdateAdapter {
  /**
   * Checks one trusted platform channel.
   *
   * @param feed - Channel URL and expected runtime target.
   * @returns The advertised installer with its declared size and checksum, or `undefined` when the
   * channel has no installer manifest.
   * @public
   */
  check(feed: {
    readonly url: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  }): Promise<IInstallerUpdate | undefined>;

  /**
   * Downloads the installer into a Symphony-owned temporary directory. The file only survives
   * when it has exactly the declared size and SHA-256 digest; any failure removes it.
   *
   * @param installer - Installer returned by {@link IInstallerUpdateAdapter.check}.
   * @param options - Progress callback in received bytes, and an optional cancellation signal.
   * @returns The absolute path of the verified installer.
   * @public
   */
  download(
    installer: IInstallerUpdate,
    options: {
      readonly onProgress: (receivedBytes: number) => void;
      readonly signal?: AbortSignal;
    },
  ): Promise<string>;

  /**
   * Opens a verified installer with the operating system: macOS mounts the disk image, Windows
   * runs the setup program.
   *
   * @param filePath - Path returned by {@link IInstallerUpdateAdapter.download}.
   * @public
   */
  launch(filePath: string): Promise<void>;
}
