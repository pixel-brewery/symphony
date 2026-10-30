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
 * @returns {string[]} Human-readable verification failures.
 * @public
 */
export function VerifyPublishedReleaseAssets(manifest, release) {
  const failures = [];
  const version = isRecord(manifest) ? manifest['version'] : undefined;
  const files = isRecord(manifest) && Array.isArray(manifest['files']) ? manifest['files'] : [];
  const tagName = isRecord(release) ? release['tag_name'] : undefined;
  const assets = isRecord(release) && Array.isArray(release['assets']) ? release['assets'] : [];
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
    if (asset['browser_download_url'] !== candidate['url']) {
      failures.push(`GitHub release asset ${name} does not match its advertised URL.`);
    }
  }

  for (const asset of assets) {
    if (!isRecord(asset) || typeof asset['name'] !== 'string') continue;
    if (!advertisedNames.has(asset['name'])) {
      failures.push(`GitHub release asset ${asset['name']} is not part of the release manifest.`);
    }
  }

  return failures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [manifestPath, releasePath] = process.argv.slice(2);
  if (!manifestPath || !releasePath) {
    throw new Error('Expected paths to a version manifest and GitHub release response.');
  }

  const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
  const release = JSON.parse(readFileSync(resolve(releasePath), 'utf8'));
  const failures = VerifyPublishedReleaseAssets(manifest, release);

  if (failures.length > 0) {
    process.stderr.write(`${failures.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Verified ${manifest.files.length} published release assets.\n`);
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
