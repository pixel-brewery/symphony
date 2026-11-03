// #region Imports

import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// #endregion

const versionPattern = '(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)';
const filePattern = new RegExp(
  `^releases/(${versionPattern})/(manifest\\.json|shared/symphony\\.ico)$`,
  'u',
);
const directoryPattern = new RegExp(`^releases(?:/${versionPattern}(?:/shared)?)?$`, 'u');
const maximumFileBytes = 1024 * 1024;
const maximumTotalBytes = 32 * 1024 * 1024;
const maximumFileCount = 10000;

/**
 * Preserves the exact historical Pages metadata as a durable release attachment.
 *
 * @param {{sourceDirectory: string, outputFile: string}} options Extracted historical tree and archive destination.
 * @returns {Promise<{outputFile: string, fileCount: number, versionCount: number}>} Prepared archive summary.
 * @public
 */
export async function PreparePagesHistory({ sourceDirectory, outputFile }) {
  const source = resolve(sourceDirectory);
  const destination = resolve(outputFile);
  const relativeDestination = relative(source, destination);
  if (
    relativeDestination === '' ||
    (!isAbsolute(relativeDestination) &&
      relativeDestination !== '..' &&
      !relativeDestination.startsWith(`..${sep}`))
  ) {
    throw new Error('The history archive must be written outside the source directory.');
  }
  const sourceStat = await lstat(source);
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
    throw new Error('The historical Pages source must be a real directory.');
  }

  const paths = [];
  const versions = new Map();
  await collectPaths(source, '', paths, versions, { entries: 0 });
  if (paths.length === 0) throw new Error('The historical Pages source contains no releases.');

  const files = [];
  let totalBytes = 0;
  for (const path of paths.sort()) {
    const match = filePattern.exec(path);
    if (!match) throw new Error(`Unsupported historical Pages file: ${path}.`);
    const [, version, kind] = match;
    const absolutePath = resolve(source, ...path.split('/'));
    const stat = await lstat(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumFileBytes) {
      throw new Error(`The historical Pages file is unsafe or exceeds its size limit: ${path}.`);
    }
    const bytes = await readFile(absolutePath);
    totalBytes += bytes.length;
    if (bytes.length > maximumFileBytes || totalBytes > maximumTotalBytes) {
      throw new Error('The historical Pages metadata exceeds its size limit.');
    }
    if (kind === 'manifest.json') validateManifest(bytes, version);
    const pair = versions.get(version) ?? new Set();
    pair.add(kind);
    versions.set(version, pair);
    files.push({ path, data: bytes.toString('base64') });
  }
  for (const [version, pair] of versions) {
    if (pair.size !== 2) {
      throw new Error(`Historical release ${version} must include its manifest and icon.`);
    }
  }

  await mkdir(dirname(destination), { recursive: true });
  try {
    const destinationStat = await lstat(destination);
    if (
      !destinationStat.isFile() ||
      destinationStat.isSymbolicLink() ||
      destinationStat.nlink > 1
    ) {
      throw new Error('The history archive destination must be a regular file.');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await writeFile(destination, `${JSON.stringify({ schemaVersion: 1, files }, undefined, 2)}\n`);
  return { outputFile: destination, fileCount: files.length, versionCount: versions.size };
}

async function collectPaths(root, directory, paths, versions, counts) {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  for (const entry of entries) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    counts.entries += 1;
    if (counts.entries > maximumFileCount * 2) {
      throw new Error('The historical Pages metadata exceeds its entry limit.');
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Historical Pages metadata must not contain symbolic links: ${path}.`);
    }
    if (entry.isDirectory()) {
      if (!directoryPattern.test(path)) {
        throw new Error(`Unsupported historical Pages directory: ${path}.`);
      }
      if (directory === 'releases') versions.set(entry.name, new Set());
      await collectPaths(root, path, paths, versions, counts);
    } else if (entry.isFile() && filePattern.test(path)) {
      paths.push(path);
      if (paths.length > maximumFileCount) {
        throw new Error('The historical Pages metadata exceeds its file limit.');
      }
    } else {
      throw new Error(`Unsupported historical Pages file: ${path}.`);
    }
  }
}

function validateManifest(bytes, version) {
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(`Historical release ${version} has invalid JSON metadata.`);
  }
  if (
    manifest?.schemaVersion !== 1 ||
    manifest.version !== version ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0
  ) {
    throw new Error(`Historical release ${version} has an incompatible manifest.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await PreparePagesHistory({
    sourceDirectory: process.env['SYMPHONY_PAGES_HISTORY_SOURCE'] ?? 'out/pages-migration',
    outputFile: process.env['SYMPHONY_PAGES_HISTORY_OUTPUT'] ?? 'out/symphony-pages-history.json',
  });
  process.stdout.write(`${JSON.stringify({ event: 'pages.history.prepared', ...result })}\n`);
}
