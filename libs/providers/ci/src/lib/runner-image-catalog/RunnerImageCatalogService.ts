// #region Imports

import type { IRunnerImageCatalog, IRunnerImageCatalogEntry } from '@symphony/domain-ci';
import type { IRunnerImageDefinition } from '@symphony/domain-core';
import {
  nodeDistributionArchive,
  ubuntuCloudImageFile,
  ubuntuGuestReleaseForFamily,
} from '@symphony/domain-ci';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { IRunnerImageCatalogOptions } from './IRunnerImageCatalogOptions';
import type { RunnerImageReport } from './RunnerImageReport';
import { readAptPackages } from './readAptPackages';
import { readEnvironment } from './readEnvironment';
import { readToolVersion } from './readToolVersion';
const RELEASES_URL =
  'https://api.github.com/repos/actions/runner-images/releases?per_page=100&page=1';

const CLOUD_IMAGE_BASE = 'https://cloud-images.ubuntu.com/releases';

const NODE_DISTRIBUTION_BASE = 'https://nodejs.org/dist';

const MAX_RELEASES_BYTES = 4 * 1024 * 1024;

const MAX_REPORT_BYTES = 4 * 1024 * 1024;

const MAX_LISTING_BYTES = 2 * 1024 * 1024;

const MAX_CHECKSUM_BYTES = 1024 * 1024;

const CATALOG_TTL_MILLISECONDS = 12 * 60 * 60 * 1_000;

const RELEASE_TAG_PATTERN = /^(ubuntu\d{2})(-arm64)?\/(\d{8}\.\d+)$/u;

interface IGitHubRelease {
  readonly tag_name?: string;
  readonly published_at?: string;
  readonly assets?: readonly { readonly name?: string; readonly browser_download_url?: string }[];
}

function findChecksum(checksums: string, fileName: string): string | undefined {
  for (const line of checksums.split('\n')) {
    const match = /^([0-9a-f]{64})\s+\*?(\S+)$/u.exec(line.trim());
    if (match && match[2] === fileName) return match[1];
  }
  return undefined;
}

function readCache(path: string): IRunnerImageCatalog | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as IRunnerImageCatalog;
    return Array.isArray(parsed.entries) && typeof parsed.refreshedAt === 'string'
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(path: string, catalog: IRunnerImageCatalog): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.writing`;
  writeFileSync(temporaryPath, JSON.stringify(catalog), { mode: 0o600 });
  renameSync(temporaryPath, path);
}

// #endregion

/**
 * Reads the machine-readable runner image catalog GitHub publishes for `actions/runner-images`.
 *
 * Microsoft does not publish the images themselves, only a software report per release. Symphony
 * therefore reproduces a selected release rather than downloading it, which keeps the guest
 * contents owned by the published upstream definition instead of by Symphony source code.
 */
export class RunnerImageCatalogService {
  // #region Fields

  private readonly _fetchImplementation: typeof fetch;
  private readonly _now: () => Date;

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IRunnerImageCatalogOptions = {}) {
    this._fetchImplementation = _options.fetch ?? fetch;
    this._now = _options.clock ?? (() => new Date());
  }

  // #endregion

  // #region Methods

  /**
   * Returns the selectable runner image releases. A cached catalog is served when it is fresh,
   * and also when the upstream refresh fails, so image selection keeps working offline.
   *
   * @param cacheRoot - Cache root.
   * @param signal - Signal.
   * @param force - Force.
   * @public
   */
  public async catalog(
    cacheRoot: string,
    signal: AbortSignal,
    force = false,
  ): Promise<IRunnerImageCatalog> {
    const cachePath = join(cacheRoot, 'runner-image-catalog.json');
    const cached = readCache(cachePath);
    if (!force && cached && this.isFresh(cached.refreshedAt)) return cached;
    try {
      const entries = await this.fetchCatalogEntries(signal);
      const catalog: IRunnerImageCatalog = {
        entries,
        refreshedAt: this._now().toISOString(),
      };
      writeCache(cachePath, catalog);
      return catalog;
    } catch (cause) {
      if (cached) {
        return {
          ...cached,
          staleReason:
            cause instanceof Error
              ? `Showing the cached catalog: ${cause.message}`
              : 'Showing the cached catalog.',
        };
      }
      throw cause;
    }
  }

  /**
   * Pins a selected release into a reproducible guest definition: the Ubuntu cloud image and its
   * digest, the declared apt package set, the declared Node.js runtime and its digest, and the
   * image's exported environment variables.
   *
   * @param entry - Entry.
   * @param signal - Signal.
   * @public
   */
  public async resolveDefinition(
    entry: IRunnerImageCatalogEntry,
    signal: AbortSignal,
  ): Promise<IRunnerImageDefinition> {
    const release = ubuntuGuestReleaseForFamily(entry.family);
    if (!release) {
      throw new Error(`Symphony cannot boot a guest for runner image family ${entry.family}.`);
    }
    const report = await this.readJson<RunnerImageReport>(
      entry.reportUrl,
      MAX_REPORT_BYTES,
      signal,
    );
    const aptPackages = readAptPackages(report);
    const nodeVersion = readToolVersion(report, 'Node.js');
    if (!nodeVersion) {
      throw new Error('The selected runner image report declares no Node.js runtime.');
    }
    const nodeArchive = nodeDistributionArchive(nodeVersion, entry.architecture);
    const nodeSha256 = await this.nodeChecksum(nodeVersion, nodeArchive, signal);
    const cloudImageFile = ubuntuCloudImageFile(release.version, entry.architecture);
    const cloudImageRelease = await this.latestCloudImageRelease(release.codename, signal);
    const cloudImageSha256 = await this.cloudImageChecksum(
      release.codename,
      cloudImageRelease,
      cloudImageFile,
      signal,
    );
    return {
      releaseTag: entry.releaseTag,
      architecture: entry.architecture,
      ubuntuVersion: release.version,
      ubuntuCodename: release.codename,
      cloudImageRelease,
      cloudImageFile,
      cloudImageSha256,
      aptPackages,
      nodeVersion,
      nodeArchive,
      nodeSha256,
      environment: readEnvironment(report),
      resolvedAt: this._now().toISOString(),
    };
  }

  private isFresh(refreshedAt: string): boolean {
    const age = this._now().getTime() - new Date(refreshedAt).getTime();
    return Number.isFinite(age) && age >= 0 && age < CATALOG_TTL_MILLISECONDS;
  }

  private async fetchCatalogEntries(
    signal: AbortSignal,
  ): Promise<readonly IRunnerImageCatalogEntry[]> {
    const releases = await this.readJson<readonly IGitHubRelease[]>(
      RELEASES_URL,
      MAX_RELEASES_BYTES,
      signal,
      await this._options.token?.(),
    );
    const entries: IRunnerImageCatalogEntry[] = [];
    for (const release of releases) {
      const match = RELEASE_TAG_PATTERN.exec(release.tag_name ?? '');
      if (!match) continue;
      const [, family, arm64Suffix, imageVersion] = match;
      const guestRelease = family ? ubuntuGuestReleaseForFamily(family) : undefined;
      if (!guestRelease || !family || !imageVersion) continue;
      const reportAsset = (release.assets ?? []).find(
        (asset) => asset.name?.startsWith('internal.') && asset.name.endsWith('.json'),
      );
      if (!reportAsset?.browser_download_url) continue;
      entries.push({
        releaseTag: release.tag_name ?? '',
        family: guestRelease.family,
        architecture: arm64Suffix ? 'arm64' : 'x64',
        ubuntuVersion: guestRelease.version,
        imageVersion,
        publishedAt: release.published_at ?? new Date(0).toISOString(),
        reportUrl: reportAsset.browser_download_url,
        latest: false,
      });
    }
    entries.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
    const seen = new Set<string>();
    return entries.map((entry) => {
      const key = `${entry.family}:${entry.architecture}`;
      const latest = !seen.has(key);
      seen.add(key);
      return { ...entry, latest };
    });
  }

  private async nodeChecksum(
    version: string,
    archive: string,
    signal: AbortSignal,
  ): Promise<string> {
    const checksums = await this.readText(
      `${NODE_DISTRIBUTION_BASE}/v${version}/SHASUMS256.txt`,
      MAX_CHECKSUM_BYTES,
      signal,
    );
    const digest = findChecksum(checksums, archive);
    if (!digest) {
      throw new Error(`Node.js ${version} publishes no checksum for ${archive}.`);
    }
    return digest;
  }

  private async latestCloudImageRelease(codename: string, signal: AbortSignal): Promise<string> {
    const listing = await this.readText(
      `${CLOUD_IMAGE_BASE}/${codename}/`,
      MAX_LISTING_BYTES,
      signal,
    );
    const releases = [...listing.matchAll(/release-(\d{8}(?:\.\d+)?)\//gu)].map(
      (match) => match[1] ?? '',
    );
    const newest = [...new Set(releases)].sort().at(-1);
    if (!newest) {
      throw new Error(`Ubuntu publishes no dated cloud-image release for ${codename}.`);
    }
    return newest;
  }

  private async cloudImageChecksum(
    codename: string,
    release: string,
    file: string,
    signal: AbortSignal,
  ): Promise<string> {
    const checksums = await this.readText(
      `${CLOUD_IMAGE_BASE}/${codename}/release-${release}/SHA256SUMS`,
      MAX_CHECKSUM_BYTES,
      signal,
    );
    const digest = findChecksum(checksums, file);
    if (!digest) {
      throw new Error(`Ubuntu ${codename} release ${release} publishes no checksum for ${file}.`);
    }
    return digest;
  }

  private async readJson<T>(
    url: string,
    maximumBytes: number,
    signal: AbortSignal,
    token?: string,
  ): Promise<T> {
    return JSON.parse(await this.readText(url, maximumBytes, signal, token)) as T;
  }

  private async readText(
    url: string,
    maximumBytes: number,
    signal: AbortSignal,
    token?: string,
  ): Promise<string> {
    const response = await this._fetchImplementation(url, {
      signal,
      redirect: 'follow',
      headers: {
        accept: 'application/json, text/plain, text/html;q=0.8, */*;q=0.5',
        'user-agent': 'symphony-managed-local-ci',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Runner image catalog request failed with HTTP ${response.status}.`);
    }
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > maximumBytes) {
      throw new Error('A runner image catalog response is too large.');
    }
    const text = await response.text();
    if (Buffer.byteLength(text) > maximumBytes) {
      throw new Error('A runner image catalog response is too large.');
    }
    return text;
  }

  // #endregion
}
