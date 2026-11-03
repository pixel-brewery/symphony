// #region Imports

import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VerifyPublishedReleaseAssets } from './VerifyPublishedReleaseAssets.mjs';

// #endregion

const numericVersion = '(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)';
const versionPattern = new RegExp(`^${numericVersion}$`, 'u');
const historyPathPattern = new RegExp(
  `^releases/(${numericVersion})/(manifest\\.json|shared/symphony\\.ico)$`,
  'u',
);
const metadataLimits = {
  'manifest.json': 256 * 1024,
  'symphony.ico': 2 * 1024 * 1024,
  'symphony-pages-history.json': 32 * 1024 * 1024,
};
const maximumReleases = 10_000;
const maximumFiles = maximumReleases * 2;
const maximumStoredBytes = 128 * 1024 * 1024;
const maximumDownloadedBytes = 256 * 1024 * 1024;
const maximumApiBytes = 8 * 1024 * 1024;
const requestTimeoutMs = 30_000;

/**
 * Reconstructs Pages metadata from verified public releases and the migrated history asset.
 *
 * @param {{repository?: string, outputDirectory?: string, token?: string, request?: typeof fetch}} [options]
 * Repository identity, generated output directory, read token, and injectable fetch boundary.
 * @returns {Promise<object>} The catalog written beside the preserved release metadata.
 * @public
 */
export async function CollectDownloadMetadata({
  repository = 'pixel-brewery/symphony',
  outputDirectory = 'out/pages-source',
  token,
  request = fetch,
} = {}) {
  if (
    typeof repository !== 'string' ||
    repository.length > 200 ||
    !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/u.test(repository) ||
    repository.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('Expected a GitHub repository in owner/name form.');
  }
  const outputRoot = resolve(outputDirectory);
  await validateOutputDirectory(outputRoot);
  const apiRoot = `https://api.github.com/repos/${repository}`;
  const publicRoot = `https://github.com/${repository}`;
  const releases = [];
  const versions = new Set();
  let listedReleaseCount = 0;
  let downloadedBytes = 0;

  for (let page = 1; page <= maximumReleases / 100; page += 1) {
    const entries = await loadJson(`${apiRoot}/releases?per_page=100&page=${page}`);
    if (!Array.isArray(entries) || entries.length > 100) {
      throw new Error('GitHub returned an invalid release page.');
    }
    listedReleaseCount += entries.length;
    for (const release of entries) {
      if (
        !isRecord(release) ||
        typeof release.draft !== 'boolean' ||
        typeof release.prerelease !== 'boolean'
      ) {
        throw new Error('GitHub returned an invalid release.');
      }
      if (release.draft || release.prerelease) continue;
      const version = releaseVersion(release);
      if (!version) continue;
      validateRelease(release, version);
      if (versions.has(version))
        throw new Error(`GitHub listed version ${version} more than once.`);
      versions.add(version);
      releases.push({ version, release });
    }
    if (entries.length < 100) break;
  }
  if (listedReleaseCount >= maximumReleases) {
    throw new Error(`The release catalog exceeds the ${maximumReleases}-release collection limit.`);
  }

  const files = new Map();
  let storedBytes = 0;

  // History is loaded first so individual release assets can only confirm, never replace,
  // already published bytes. Several releases may carry an identical migration archive.
  for (const { release } of releases) {
    const archive = findMetadataAsset(release, 'symphony-pages-history.json');
    if (!archive) continue;
    const history = parseJson(await loadAsset(archive), 'the Pages history asset');
    if (
      !isRecord(history) ||
      history.schemaVersion !== 1 ||
      !Array.isArray(history.files) ||
      history.files.length === 0 ||
      history.files.length > maximumFiles
    ) {
      throw new Error('The Pages history asset has an invalid schema or file count.');
    }
    for (const entry of history.files) {
      if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.data !== 'string') {
        throw new Error('The Pages history asset contains an invalid file.');
      }
      const match = historyPathPattern.exec(entry.path);
      if (!match || !validVersion(match[1])) {
        throw new Error('The Pages history asset contains an unsupported file path.');
      }
      const limit = entry.path.endsWith('/manifest.json')
        ? metadataLimits['manifest.json']
        : metadataLimits['symphony.ico'];
      if (!entry.data || entry.data.length > 4 * Math.ceil(limit / 3)) {
        throw new Error('A Pages history file exceeds its metadata size limit.');
      }
      const bytes = Buffer.from(entry.data, 'base64');
      if (bytes.length > limit || bytes.toString('base64') !== entry.data) {
        throw new Error('The Pages history asset contains invalid base64 metadata.');
      }
      addFile(entry.path, bytes);
    }
  }

  for (const { version, release } of releases) {
    const manifestAsset = findMetadataAsset(release, 'manifest.json');
    const iconAsset = findMetadataAsset(release, 'symphony.ico');
    if (Boolean(manifestAsset) !== Boolean(iconAsset)) {
      throw new Error(`Release ${version} has an incomplete metadata asset pair.`);
    }
    if (manifestAsset && iconAsset) {
      addFile(`releases/${version}/manifest.json`, await loadAsset(manifestAsset));
      addFile(`releases/${version}/shared/symphony.ico`, await loadAsset(iconAsset));
    }
  }

  const manifests = new Map();
  for (const [path, bytes] of files) {
    const version = historyPathPattern.exec(path)[1];
    if (
      !files.has(`releases/${version}/manifest.json`) ||
      !files.has(`releases/${version}/shared/symphony.ico`)
    ) {
      throw new Error(`Preserved version ${version} has incomplete metadata.`);
    }
    if (path.endsWith('/manifest.json')) {
      const manifest = parseJson(bytes, `the manifest for ${version}`);
      validateManifest(manifest, version, publicRoot);
      manifests.set(version, manifest);
    }
  }

  const catalogReleases = releases.map(({ version, release }) => {
    const manifest = manifests.get(version);
    if (!manifest) throw new Error(`Public release ${version} has no durable version metadata.`);
    const failures = VerifyPublishedReleaseAssets(manifest, release);
    if (failures.length) throw new Error(`Release ${version} is incomplete: ${failures.join(' ')}`);
    return {
      version,
      htmlUrl: release.html_url,
      publishedAt: release.published_at,
      manifest,
    };
  });
  catalogReleases.sort((left, right) => compareVersions(right.version, left.version));
  if (catalogReleases.length === 0)
    throw new Error('No complete public desktop release is available.');

  const latest = await loadJson(`${apiRoot}/releases/latest`);
  const stable = releaseVersion(latest);
  if (!stable || latest.draft !== false || latest.prerelease !== false) {
    throw new Error('GitHub Latest must select a published full numeric desktop release.');
  }
  validateRelease(latest, stable);
  if (!releases.some((entry) => entry.version === stable && entry.release.id === latest.id)) {
    throw new Error('GitHub Latest does not select a complete release in the collected catalog.');
  }
  const catalog = {
    schemaVersion: 1,
    stable,
    canary: catalogReleases[0].version,
    releases: catalogReleases,
  };
  await writeOutput(outputRoot, files, catalog);
  return catalog;

  function validateRelease(release, version) {
    if (
      !Number.isSafeInteger(release.id) ||
      release.id <= 0 ||
      release.url !== `${apiRoot}/releases/${release.id}` ||
      release.html_url !== `${publicRoot}/releases/tag/v${version}` ||
      !validTimestamp(release.published_at) ||
      !Array.isArray(release.assets) ||
      release.assets.length > 64
    ) {
      throw new Error(
        `GitHub release ${version} has invalid identity, publication time, or assets.`,
      );
    }
  }

  function findMetadataAsset(release, name) {
    const matches = release.assets.filter((asset) => isRecord(asset) && asset.name === name);
    if (matches.length > 1)
      throw new Error(`A release contains duplicate ${name} metadata assets.`);
    const asset = matches[0];
    if (!asset) return undefined;
    if (
      !Number.isSafeInteger(asset.id) ||
      asset.id <= 0 ||
      asset.url !== `${apiRoot}/releases/assets/${asset.id}` ||
      asset.browser_download_url !==
        `${publicRoot}/releases/download/${release.tag_name}/${name}` ||
      asset.state !== 'uploaded' ||
      !Number.isSafeInteger(asset.size) ||
      asset.size <= 0 ||
      asset.size > metadataLimits[name] ||
      typeof asset.digest !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/u.test(asset.digest)
    ) {
      throw new Error(`The ${name} metadata asset has invalid identity, size, state, or digest.`);
    }
    return asset;
  }

  async function loadAsset(asset) {
    const bytes = await loadBytes(
      asset.url,
      metadataLimits[asset.name],
      asset.browser_download_url,
    );
    if (
      bytes.length !== asset.size ||
      `sha256:${createHash('sha256').update(bytes).digest('hex')}` !== asset.digest
    ) {
      throw new Error(
        `The downloaded ${asset.name} metadata does not match its GitHub size and digest.`,
      );
    }
    return bytes;
  }

  async function loadJson(url) {
    return parseJson(await loadBytes(url, maximumApiBytes), 'the GitHub API response');
  }

  async function loadBytes(initialUrl, limit, browserDownloadUrl) {
    const signal = AbortSignal.timeout(requestTimeoutMs);
    let url = initialUrl;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      const headers = {
        Accept: browserDownloadUrl ? 'application/octet-stream' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (token && new URL(url).origin === 'https://api.github.com') {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await request(url, { headers, signal, redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!browserDownloadUrl || !location || redirects === 3) {
          throw new Error('GitHub returned an unsupported metadata redirect.');
        }
        const next = new URL(location, url);
        if (
          next.protocol !== 'https:' ||
          next.username ||
          next.password ||
          next.hash ||
          next.port ||
          (!['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(
            next.hostname,
          ) &&
            next.href !== browserDownloadUrl)
        ) {
          throw new Error('GitHub returned an untrusted metadata redirect.');
        }
        url = next.href;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`GitHub metadata request failed with HTTP ${response.status}.`);
      }
      const advertisedBytes = response.headers.get('content-length');
      if (advertisedBytes && (!/^\d+$/u.test(advertisedBytes) || Number(advertisedBytes) > limit)) {
        await response.body?.cancel();
        throw new Error('A GitHub metadata response exceeds its size limit.');
      }
      if (!response.body) return Buffer.alloc(0);
      const reader = response.body.getReader();
      const chunks = [];
      let bytes = 0;
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          downloadedBytes += next.value.byteLength;
          if (bytes > limit || downloadedBytes > maximumDownloadedBytes) {
            await reader.cancel();
            throw new Error('A GitHub metadata response exceeds its size limit.');
          }
          chunks.push(Buffer.from(next.value));
        }
      } finally {
        reader.releaseLock();
      }
      return Buffer.concat(chunks, bytes);
    }
    throw new Error('GitHub exceeded the metadata redirect limit.');
  }

  function addFile(path, bytes) {
    const previous = files.get(path);
    if (previous) {
      if (!previous.equals(bytes)) throw new Error(`Published metadata bytes conflict at ${path}.`);
      return;
    }
    storedBytes += bytes.length;
    if (files.size >= maximumFiles || storedBytes > maximumStoredBytes) {
      throw new Error('The preserved Pages metadata exceeds the collection limit.');
    }
    files.set(path, bytes);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const catalog = await CollectDownloadMetadata({
    outputDirectory: process.env['SYMPHONY_PAGES_SOURCE'] ?? 'out/pages-source',
    token: process.env['GH_TOKEN'],
  });
  process.stdout.write(`Collected ${catalog.releases.length} public desktop releases.\n`);
}

function validateManifest(manifest, version, publicRoot) {
  if (
    !isRecord(manifest) ||
    manifest.schemaVersion !== 1 ||
    manifest.version !== version ||
    typeof manifest.sourceCommit !== 'string' ||
    !/^[a-f0-9]{40}$/u.test(manifest.sourceCommit) ||
    !validTimestamp(manifest.createdAt) ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== 3
  ) {
    throw new Error(
      `The preserved manifest for ${version} has an invalid schema or installer matrix.`,
    );
  }
  const expectedNames = {
    darwin: `Symphony-darwin-arm64-${version}.dmg`,
    win32: 'SymphonySetup.exe',
    linux: `symphony_${version}_arm64.deb`,
  };
  const platforms = new Set();
  for (const file of manifest.files) {
    if (
      !isRecord(file) ||
      !Object.hasOwn(expectedNames, file.platform) ||
      platforms.has(file.platform) ||
      file.architecture !== 'arm64' ||
      file.name !== expectedNames[file.platform] ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes <= 0 ||
      typeof file.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(file.sha256) ||
      file.url !== `${publicRoot}/releases/download/v${version}/${encodeURIComponent(file.name)}`
    ) {
      throw new Error(`The preserved manifest for ${version} contains an invalid installer.`);
    }
    platforms.add(file.platform);
  }
}

async function validateOutputDirectory(outputRoot) {
  const workspaceRelative = relative(outputRoot, resolve('.'));
  if (
    !workspaceRelative ||
    (workspaceRelative !== '..' && !workspaceRelative.startsWith(`..${sep}`))
  ) {
    throw new Error(
      'Pages metadata requires a dedicated output directory, not a workspace ancestor.',
    );
  }
  const existing = await lstat(outputRoot).catch((error) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    throw new Error('Pages metadata output must be a directory, without a symbolic link.');
  }
}

async function writeOutput(outputRoot, files, catalog) {
  await mkdir(dirname(outputRoot), { recursive: true });
  const staging = await mkdtemp(join(dirname(outputRoot), `.${basename(outputRoot)}-`));
  try {
    for (const [path, bytes] of [...files.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const destination = join(staging, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    await writeFile(
      join(staging, 'catalog.json'),
      `${JSON.stringify(catalog, undefined, 2)}\n`,
      'utf8',
    );
    await validateOutputDirectory(outputRoot);
    await rm(outputRoot, { recursive: true, force: true });
    await rename(staging, outputRoot);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function releaseVersion(release) {
  if (
    !isRecord(release) ||
    typeof release.tag_name !== 'string' ||
    !release.tag_name.startsWith('v')
  )
    return undefined;
  const version = release.tag_name.slice(1);
  if (!versionPattern.test(version)) return undefined;
  if (!validVersion(version))
    throw new Error('A numeric release version exceeds the supported integer range.');
  return version;
}

function validVersion(version) {
  return (
    typeof version === 'string' &&
    versionPattern.test(version) &&
    version.split('.').every((part) => Number.isSafeInteger(Number(part)))
  );
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function validTimestamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
  );
}

function parseJson(bytes, description) {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`Could not parse ${description} as UTF-8 JSON.`);
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
