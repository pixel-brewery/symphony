// #region Imports

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// #endregion

/**
 * Verifies that a GitHub release exposes every artifact advertised by a version manifest.
 *
 * @param {unknown} manifest Version manifest generated for the update origin.
 * @param {unknown} release GitHub Releases API response for the published tag.
 * @param {{allowDraft?: boolean}} [options] Allows verification before publishing a draft by ID.
 * @returns {string[]} Human-readable verification failures.
 * @public
 */
export function VerifyPublishedReleaseAssets(manifest, release, { allowDraft = false } = {}) {
  const failures = [];
  const version = isRecord(manifest) ? manifest['version'] : undefined;
  const files = isRecord(manifest) && Array.isArray(manifest['files']) ? manifest['files'] : [];
  const tagName = isRecord(release) ? release['tag_name'] : undefined;
  const assets = isRecord(release) && Array.isArray(release['assets']) ? release['assets'] : [];
  const metadataNames = new Set(['manifest.json', 'symphony.ico', 'symphony-pages-history.json']);
  const advertisedNames = new Set(
    files
      .filter((candidate) => isRecord(candidate) && typeof candidate['name'] === 'string')
      .map((candidate) => candidate['name']),
  );

  if (typeof version !== 'string' || version.trim() === '') {
    failures.push('The version manifest must identify its release version.');
  } else if (tagName !== `v${version}`) {
    failures.push(`The GitHub release tag ${String(tagName)} does not match version ${version}.`);
  }
  if (files.length === 0) {
    failures.push('The version manifest must advertise at least one release artifact.');
  }
  if (allowDraft) {
    if (!isRecord(release) || release['draft'] !== true) {
      failures.push('Draft asset verification requires a draft GitHub release.');
    }
    if (!isRecord(release) || !Number.isSafeInteger(release['id']) || release['id'] <= 0) {
      failures.push('Draft asset verification requires a positive numeric release ID.');
    }
  } else if (isRecord(release) && release['draft'] === true) {
    failures.push('Draft GitHub releases cannot pass public asset verification.');
  }

  for (const candidate of files) {
    if (!isRecord(candidate) || typeof candidate['name'] !== 'string') {
      failures.push('The version manifest contains an invalid release artifact.');
      continue;
    }

    const name = candidate['name'];
    const matchingAssets = assets.filter((asset) => isRecord(asset) && asset['name'] === name);
    if (matchingAssets.length !== 1) {
      failures.push(`GitHub must publish exactly one release asset named ${name}.`);
      continue;
    }

    const asset = matchingAssets[0];
    if (!isRecord(asset)) continue;
    if (asset['state'] !== 'uploaded') {
      failures.push(`GitHub release asset ${name} is not fully uploaded.`);
    }
    if (asset['size'] !== candidate['bytes']) {
      failures.push(`GitHub release asset ${name} has an unexpected byte count.`);
    }
    if (asset['digest'] !== `sha256:${String(candidate['sha256'])}`) {
      failures.push(`GitHub release asset ${name} has an unexpected SHA-256 digest.`);
    }
    const matchesUrl = allowDraft
      ? matchesDraftAssetUrl(candidate['url'], asset['browser_download_url'], version, name)
      : asset['browser_download_url'] === candidate['url'];
    if (!matchesUrl) {
      failures.push(`GitHub release asset ${name} does not match its advertised URL.`);
    }
  }

  for (const asset of assets) {
    if (!isRecord(asset) || typeof asset['name'] !== 'string') continue;
    if (metadataNames.has(asset['name'])) {
      if (
        assets.filter((candidate) => isRecord(candidate) && candidate['name'] === asset['name'])
          .length !== 1
      ) {
        failures.push(`GitHub must publish exactly one metadata asset named ${asset['name']}.`);
      }
      if (asset['state'] !== 'uploaded') {
        failures.push(`GitHub metadata asset ${asset['name']} is not fully uploaded.`);
      }
      if (!Number.isSafeInteger(asset['size']) || asset['size'] <= 0) {
        failures.push(`GitHub metadata asset ${asset['name']} has an invalid byte count.`);
      }
      if (typeof asset['digest'] !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(asset['digest'])) {
        failures.push(`GitHub metadata asset ${asset['name']} has an invalid SHA-256 digest.`);
      }
    } else if (!advertisedNames.has(asset['name'])) {
      failures.push(`GitHub release asset ${asset['name']} is not part of the release manifest.`);
    }
  }

  return failures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [manifestPath, releasePath, mode, ...extraArguments] = process.argv.slice(2);
  if (!manifestPath || !releasePath || (mode && mode !== '--draft') || extraArguments.length) {
    throw new Error(
      'Expected paths to a version manifest and GitHub release response, optionally followed by --draft.',
    );
  }

  const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
  const release = JSON.parse(readFileSync(resolve(releasePath), 'utf8'));
  const failures = VerifyPublishedReleaseAssets(manifest, release, {
    allowDraft: mode === '--draft',
  });

  if (failures.length > 0) {
    process.stderr.write(`${failures.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Verified ${manifest.files.length} ${mode === '--draft' ? 'draft' : 'published'} release assets.\n`,
    );
  }
}

function matchesDraftAssetUrl(expected, actual, version, name) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  try {
    const expectedUrl = new URL(expected);
    const actualUrl = new URL(actual);
    if (
      [expectedUrl, actualUrl].some(
        (url) =>
          url.origin !== 'https://github.com' ||
          url.username ||
          url.password ||
          url.search ||
          url.hash,
      )
    )
      return false;
    const expectedPath = /^\/([^/]+)\/([^/]+)\/releases\/download\/v([^/]+)\/([^/]+)$/u.exec(
      expectedUrl.pathname,
    );
    if (
      !expectedPath ||
      expectedPath[3] !== version ||
      expectedPath[4] !== encodeURIComponent(name)
    )
      return false;
    const repositoryPrefix = `/${expectedPath[1]}/${expectedPath[2]}/releases/download/`;
    if (!actualUrl.pathname.startsWith(repositoryPrefix)) return false;
    const segments = actualUrl.pathname.slice(repositoryPrefix.length).split('/');
    return (
      segments.length === 2 &&
      (segments[0] === `v${version}` || /^untagged-[a-f0-9]+$/u.test(segments[0])) &&
      segments[1] === encodeURIComponent(name)
    );
  } catch {
    return false;
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
