import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, relative, resolve, sep } from 'node:path';

// Reconstructs the input tree of an already published release from its immutable
// manifest. Selecting a stable version must never rebuild or re-sign anything, so
// the bytes are downloaded from the release and matched against the checksums the
// publishing run recorded before any channel is allowed to point at them.
const version = process.env['SYMPHONY_RELEASE_VERSION'];
const baseUrl = (process.env['SYMPHONY_UPDATE_BASE_URL'] ?? '').replace(/\/+$/u, '');
const outputRoot = resolve(process.env['SYMPHONY_UPDATE_INPUT'] ?? 'out/update-input');

if (!version || !/^\d+\.\d+\.\d+$/u.test(version)) {
  throw new Error('SYMPHONY_RELEASE_VERSION must be a numeric major.minor.patch version.');
}
const parsedBaseUrl = new URL(baseUrl);
if (parsedBaseUrl.protocol !== 'https:' || parsedBaseUrl.username || parsedBaseUrl.password) {
  throw new Error('SYMPHONY_UPDATE_BASE_URL must be a credential-free HTTPS URL.');
}
const relativeOutput = relative(resolve('.'), outputRoot);
if (!relativeOutput || relativeOutput.startsWith(`..${sep}`) || relativeOutput === '..') {
  throw new Error('SYMPHONY_UPDATE_INPUT must be a dedicated path inside the workspace.');
}

const manifest = await fetchJson(`${baseUrl}/releases/${version}/manifest.json`);
if (manifest.version !== version) {
  throw new Error(
    `The manifest at the update origin describes ${manifest.version}, not ${version}.`,
  );
}
if (!Array.isArray(manifest.files) || !manifest.files.length) {
  throw new Error(`The manifest for ${version} lists no files.`);
}

for (const file of manifest.files) {
  const targetDirectory = resolve(outputRoot, file.platform, file.architecture);
  await mkdir(targetDirectory, { recursive: true });
  const bytes = Buffer.from(await fetchBytes(file.url));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== file.sha256) {
    throw new Error(`${file.name} does not match the checksum published for ${version}.`);
  }
  if (bytes.byteLength !== file.bytes) {
    throw new Error(`${file.name} does not match the byte count published for ${version}.`);
  }
  await writeFile(resolve(targetDirectory, basename(file.name)), bytes);
}

process.stdout.write(
  `${JSON.stringify({
    event: 'release.download.verified',
    version,
    sourceCommit: manifest.sourceCommit,
    artifactCount: manifest.files.length,
  })}\n`,
);

async function fetchJson(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} responded with ${response.status}.`);
  return response.json();
}

async function fetchBytes(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} responded with ${response.status}.`);
  return response.arrayBuffer();
}
