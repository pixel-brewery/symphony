import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, relative, resolve, sep } from 'node:path';

const inputRoot = resolve(process.env['SYMPHONY_UPDATE_INPUT'] ?? 'out/update-input');
const outputRoot = resolve(process.env['SYMPHONY_UPDATE_OUTPUT'] ?? 'out/update-publication');
const version = process.env['SYMPHONY_RELEASE_VERSION'];
const channelSelection = process.env['SYMPHONY_UPDATE_CHANNEL'] ?? 'canary';
const baseUrl = (process.env['SYMPHONY_UPDATE_BASE_URL'] ?? '').replace(/\/+$/u, '');
const artifactBaseUrl = (process.env['SYMPHONY_UPDATE_ARTIFACT_BASE_URL'] ?? '').replace(
  /\/+$/u,
  '',
);
const sourceCommit = process.env['GITHUB_SHA'] ?? 'local';
const createdAt = new Date().toISOString();

if (!version || !/^\d+\.\d+\.\d+$/u.test(version)) {
  throw new Error('SYMPHONY_RELEASE_VERSION must be a numeric major.minor.patch version.');
}
if (!['stable', 'canary', 'all'].includes(channelSelection)) {
  throw new Error('SYMPHONY_UPDATE_CHANNEL must be stable, canary, or all.');
}
const channels = channelSelection === 'all' ? ['canary', 'stable'] : [channelSelection];
assertPublicHttpsOrigin(baseUrl, 'SYMPHONY_UPDATE_BASE_URL');
if (artifactBaseUrl) {
  assertPublicHttpsOrigin(artifactBaseUrl, 'SYMPHONY_UPDATE_ARTIFACT_BASE_URL');
}
const relativeOutput = relative(resolve('.'), outputRoot);
if (!relativeOutput || relativeOutput.startsWith(`..${sep}`) || relativeOutput === '..') {
  throw new Error('SYMPHONY_UPDATE_OUTPUT must be a dedicated path inside the workspace.');
}

await rm(outputRoot, { recursive: true, force: true });
const inputFiles = await listFiles(inputRoot);
const publishedFiles = [];

for (const sourcePath of inputFiles) {
  const placement = inferPlacement(relative(inputRoot, sourcePath));
  if (!placement || !isPublishedReleaseArtifact(sourcePath, placement)) continue;
  const targetDirectory = artifactBaseUrl
    ? resolve(outputRoot, 'assets')
    : resolve(outputRoot, 'releases', version, placement.platform, placement.architecture);
  await mkdir(targetDirectory, { recursive: true });
  const targetPath = resolve(targetDirectory, basename(sourcePath));
  if (publishedFiles.some((file) => file.targetPath === targetPath)) {
    throw new Error(
      `Two release artifacts share the name ${basename(sourcePath)}. A flat asset store cannot hold both.`,
    );
  }
  await cp(sourcePath, targetPath);
  const bytes = await readFile(targetPath);
  publishedFiles.push({
    platform: placement.platform,
    architecture: placement.architecture,
    name: basename(targetPath),
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    targetPath,
  });
}

if (!publishedFiles.length) throw new Error(`No update artifacts were found below ${inputRoot}.`);

const requiredArtifacts = [
  {
    label: 'macOS arm64 DMG',
    matches: (file) =>
      file.platform === 'darwin' &&
      file.architecture === 'arm64' &&
      file.name === `Symphony-darwin-arm64-${version}.dmg`,
  },
  /* Archive and Intel packages stay intentionally disabled until their support is restored.
  {
    label: 'macOS arm64 ZIP',
    matches: (file) =>
      file.platform === 'darwin' && file.architecture === 'arm64' && file.name.endsWith('.zip'),
  },
  {
    label: 'macOS x64 ZIP',
    matches: (file) =>
      file.platform === 'darwin' && file.architecture === 'x64' && file.name.endsWith('.zip'),
  },
  {
    label: 'macOS x64 DMG',
    matches: (file) =>
      file.platform === 'darwin' && file.architecture === 'x64' && file.name.endsWith('.dmg'),
  },
  */
  {
    label: 'Windows arm64 installer',
    matches: (file) =>
      file.platform === 'win32' &&
      file.architecture === 'arm64' &&
      file.name === 'SymphonySetup.exe',
  },
  /* Squirrel's full NuGet payload stays intentionally disabled while releases
  expose only the Windows installer.
  {
    label: 'Windows arm64 full NuGet package',
    matches: (file) =>
      file.platform === 'win32' &&
      file.architecture === 'arm64' &&
      file.name.endsWith('-full.nupkg'),
  },
  */
  {
    label: 'Linux arm64 Debian package',
    matches: (file) =>
      file.platform === 'linux' &&
      file.architecture === 'arm64' &&
      file.name === `symphony_${version}_arm64.deb`,
  },
];
const missingArtifacts = requiredArtifacts
  .filter((requirement) => !publishedFiles.some(requirement.matches))
  .map((requirement) => requirement.label);
if (missingArtifacts.length) {
  throw new Error(`The release matrix is incomplete: ${missingArtifacts.join(', ')}.`);
}

for (const channel of channels) {
  for (const installer of publishedFiles.filter(isInstallerArtifact)) {
    const channelDirectory = resolve(
      outputRoot,
      'channels',
      channel,
      installer.platform,
      installer.architecture,
    );
    await mkdir(channelDirectory, { recursive: true });
    await writeFile(
      resolve(channelDirectory, 'installer.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          version,
          platform: installer.platform,
          architecture: installer.architecture,
          artifact: {
            name: installer.name,
            bytes: installer.bytes,
            sha256: installer.sha256,
            url: artifactUrl(installer),
          },
        },
        undefined,
        2,
      )}\n`,
      'utf8',
    );
  }

  for (const architecture of ['arm64', 'x64']) {
    const macArchive = publishedFiles.find(
      (file) =>
        file.platform === 'darwin' &&
        file.architecture === architecture &&
        file.name.endsWith('.zip'),
    );
    if (macArchive) {
      const channelDirectory = resolve(outputRoot, 'channels', channel, 'darwin', architecture);
      await mkdir(channelDirectory, { recursive: true });
      await writeFile(
        resolve(channelDirectory, 'RELEASES.json'),
        `${JSON.stringify(
          {
            currentRelease: version,
            releases: [
              {
                version,
                updateTo: {
                  version,
                  pub_date: createdAt,
                  name: `Symphony ${version}`,
                  url: artifactUrl(macArchive),
                },
              },
            ],
          },
          undefined,
          2,
        )}\n`,
        'utf8',
      );
    }

    const windowsPackage = publishedFiles.find(
      (file) =>
        file.platform === 'win32' &&
        file.architecture === architecture &&
        file.name.endsWith('-full.nupkg'),
    );
    if (windowsPackage) {
      const channelDirectory = resolve(outputRoot, 'channels', channel, 'win32', architecture);
      await mkdir(channelDirectory, { recursive: true });
      const bytes = await readFile(windowsPackage.targetPath);
      const sha1 = createHash('sha1').update(bytes).digest('hex').toUpperCase();
      await writeFile(
        resolve(channelDirectory, 'RELEASES'),
        `${sha1} ${artifactUrl(windowsPackage)} ${windowsPackage.bytes}\n`,
        'utf8',
      );
    }
  }
}

const releaseDirectory = resolve(outputRoot, 'releases', version);
const sharedAssetDirectory = resolve(releaseDirectory, 'shared');
await mkdir(sharedAssetDirectory, { recursive: true });
await cp(resolve('resources/icons/symphony.ico'), resolve(sharedAssetDirectory, 'symphony.ico'));
await writeFile(
  resolve(releaseDirectory, 'manifest.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      version,
      sourceCommit,
      createdAt,
      files: publishedFiles.map(({ targetPath: _targetPath, ...file }) => ({
        ...file,
        url: artifactUrl(file),
      })),
    },
    undefined,
    2,
  )}\n`,
  'utf8',
);

process.stdout.write(
  `${JSON.stringify({
    event: 'update.publication.prepared',
    version,
    channels,
    artifactCount: publishedFiles.length,
    outputRoot,
  })}\n`,
);

function artifactUrl(file) {
  if (artifactBaseUrl) return `${artifactBaseUrl}/${encodeURIComponent(file.name)}`;
  return [
    baseUrl,
    'releases',
    version,
    file.platform,
    file.architecture,
    encodeURIComponent(file.name),
  ].join('/');
}

function assertPublicHttpsOrigin(candidate, variableName) {
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`${variableName} must be a credential-free HTTPS URL.`);
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`${variableName} must be a credential-free HTTPS URL.`);
  }
}

function inferPlacement(path) {
  const normalized = path.replaceAll('\\', '/').toLowerCase();
  // Squirrel's maker emits its own RELEASES index beside the packages. Channel
  // metadata is generated here instead, so publishing the maker's copy would
  // expose a second feed that no client is meant to read.
  if (basename(normalized) === 'releases') return undefined;
  const platform = ['darwin', 'win32', 'linux'].find((candidate) => normalized.includes(candidate));
  const architecture = ['arm64', 'x64'].find((candidate) => normalized.includes(candidate));
  return platform && architecture ? { platform, architecture } : undefined;
}

function isPublishedReleaseArtifact(sourcePath, placement) {
  const name = basename(sourcePath);
  return (
    (placement.platform === 'darwin' &&
      placement.architecture === 'arm64' &&
      name === `Symphony-darwin-arm64-${version}.dmg`) ||
    (placement.platform === 'win32' &&
      placement.architecture === 'arm64' &&
      name === 'SymphonySetup.exe') ||
    (placement.platform === 'linux' &&
      placement.architecture === 'arm64' &&
      name === `symphony_${version}_arm64.deb`)
    /* Disabled publication rules retained for a later support expansion:
    || (placement.platform === 'darwin' && name.endsWith('.zip'))
    || (placement.platform === 'darwin' &&
        placement.architecture === 'x64' &&
        name.endsWith('.dmg'))
    || (placement.platform === 'win32' && name.endsWith('-full.nupkg'))
    || (placement.platform === 'win32' &&
        placement.architecture === 'x64' &&
        name.endsWith('.exe'))
    || (placement.platform === 'linux' &&
        placement.architecture === 'x64' &&
        name.endsWith('.deb'))
    */
  );
}

function isInstallerArtifact(file) {
  return (
    (file.platform === 'darwin' && file.name.endsWith('.dmg')) ||
    (file.platform === 'win32' && file.name.endsWith('.exe')) ||
    (file.platform === 'linux' && file.name.endsWith('.deb'))
  );
}

async function listFiles(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name));
}
