// #region Imports

import { z } from 'zod';
import type { IInstallerUpdateAdapter } from './update-coordinator';

// #endregion

const numericVersionSchema = z
  .string()
  .max(17)
  .regex(/^\d+\.\d+\.\d+$/u)
  .refine((version) => version.split('.').every((part) => Number(part) <= 65_535));
const installerUpdateManifestSchema = z.object({
  schemaVersion: z.literal(1),
  version: numericVersionSchema,
  platform: z.enum(['darwin', 'win32', 'linux']),
  architecture: z.string().min(1).max(30),
  artifact: z.object({
    name: z.string().min(1).max(255),
    bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    url: z.url(),
  }),
});

/**
 * Reads the installer-only update channel over credential-free HTTPS.
 *
 * @public
 */
export class HttpInstallerUpdateAdapter implements IInstallerUpdateAdapter {
  // #region Fields

  private readonly _fetchImplementation: typeof fetch;

  // #endregion

  // #region Ctor

  /**
   * Creates an installer update adapter.
   *
   * @param fetchImplementation - Fetch implementation used for the channel request.
   * @public
   */
  public constructor(fetchImplementation: typeof fetch = globalThis.fetch) {
    this._fetchImplementation = fetchImplementation;
  }

  // #endregion

  // #region Methods

  /**
   * Checks the installer channel manifest.
   *
   * @param feed - Trusted channel location and expected runtime target.
   * @public
   */
  public async check(feed: {
    readonly url: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  }): Promise<{ readonly version: string; readonly downloadUrl: string } | undefined> {
    const response = await this._fetchImplementation(feed.url, {
      headers: { accept: 'application/json' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404) return undefined;
    if (!response.ok)
      throw new Error(`The installer update feed responded with ${response.status}.`);

    const manifest = installerUpdateManifestSchema.parse(await response.json());
    if (manifest.platform !== feed.platform || manifest.architecture !== feed.architecture) {
      throw new Error('The installer update feed does not match this application build.');
    }
    const downloadUrl = new URL(manifest.artifact.url);
    if (
      downloadUrl.protocol !== 'https:' ||
      downloadUrl.username ||
      downloadUrl.password ||
      downloadUrl.search ||
      downloadUrl.hash
    ) {
      throw new Error('The installer update feed contains an untrusted download URL.');
    }
    const expectedSuffix = { darwin: '.dmg', win32: '.exe', linux: '.deb' }[manifest.platform];
    const urlName = decodeURIComponent(downloadUrl.pathname.split('/').at(-1) ?? '');
    if (!manifest.artifact.name.endsWith(expectedSuffix) || urlName !== manifest.artifact.name) {
      throw new Error('The installer update feed contains an invalid platform artifact.');
    }
    return { version: manifest.version, downloadUrl: downloadUrl.toString() };
  }

  // #endregion
}
