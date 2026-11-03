// #region Imports

import { randomUUID } from 'node:crypto';
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { RenderDownloadPage } from './RenderDownloadPage.mjs';

// #endregion

const maximumMetadataBytes = 64 * 1024 * 1024;
const maximumMetadataFiles = 20000;

/**
 * Builds a complete Pages artifact without depending on an earlier deployment.
 *
 * @param {{sourceDirectory: string, outputDirectory: string}} options Source metadata and dedicated output below workspace out/.
 * @returns {Promise<{outputDirectory: string, stable: string, canary: string, releaseCount: number}>} The generated publication identity.
 * @public
 */
export async function BuildDownloadSite({ sourceDirectory, outputDirectory }) {
  const source = await realpath(resolve(sourceDirectory));
  const output = resolve(outputDirectory);
  await validateOutput(source, output);
  const sourceStat = await lstat(resolve(sourceDirectory));
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
    throw new Error('Download metadata must be a directory without symbolic links.');
  }
  const catalogPath = resolve(source, 'catalog.json');
  const catalogStat = await lstat(catalogPath);
  if (!catalogStat.isFile() || catalogStat.isSymbolicLink()) {
    throw new Error('The download catalog must be an ordinary metadata file.');
  }
  if (catalogStat.size > maximumMetadataBytes) {
    throw new Error('The download catalog exceeds the metadata size limit.');
  }
  const catalogBytes = await readFile(catalogPath);
  const catalog = JSON.parse(catalogBytes.toString('utf8'));
  const html = RenderDownloadPage(catalog);
  const metadata = await readHistoricalMetadata(source);
  for (const release of catalog.releases) {
    const storedManifest = metadata.get(`releases/${release.version}/manifest.json`);
    if (
      !storedManifest ||
      !metadata.has(`releases/${release.version}/shared/symphony.ico`) ||
      !isDeepStrictEqual(JSON.parse(storedManifest.toString('utf8')), release.manifest)
    ) {
      throw new Error(`Release ${release.version} does not match its preserved version metadata.`);
    }
  }

  const staging = `${output}.building-${randomUUID()}`;
  try {
    await mkdir(resolve(staging, 'assets'), { recursive: true });
    for (const [path, bytes] of metadata) {
      const destination = resolve(staging, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    for (const channel of ['stable', 'canary']) {
      const release = catalog.releases.find((candidate) => candidate.version === catalog[channel]);
      for (const file of release.manifest.files) {
        const directory = resolve(staging, 'channels', channel, file.platform, file.architecture);
        await mkdir(directory, { recursive: true });
        await writeFile(
          resolve(directory, 'installer.json'),
          `${JSON.stringify(
            {
              schemaVersion: 1,
              version: release.version,
              platform: file.platform,
              architecture: file.architecture,
              artifact: {
                name: file.name,
                bytes: file.bytes,
                sha256: file.sha256,
                url: file.url,
              },
            },
            undefined,
            2,
          )}\n`,
          'utf8',
        );
      }
    }
    await copyFile(
      fileURLToPath(new URL('../resources/download-page/downloads.css', import.meta.url)),
      resolve(staging, 'assets', 'downloads.css'),
    );
    await copyFile(
      fileURLToPath(new URL('../resources/icons/png/app/symphony-192.png', import.meta.url)),
      resolve(staging, 'assets', 'symphony.png'),
    );
    await writeFile(resolve(staging, 'index.html'), html, 'utf8');
    // The earlier artifact remains untouched until all source data has been checked
    // and the complete replacement has been written successfully.
    await validateOutput(source, output);
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }

  return {
    outputDirectory: output,
    stable: catalog.stable,
    canary: catalog.canary,
    releaseCount: catalog.releases.length,
  };
}

async function validateOutput(source, output) {
  const workspace = resolve('.');
  const outputRelative = relative(resolve(workspace, 'out'), output);
  if (!outputRelative || isOutside(outputRelative)) {
    throw new Error('SYMPHONY_PAGES_OUTPUT must be a dedicated directory below workspace out/.');
  }
  if (!isOutside(relative(source, output)) || !isOutside(relative(output, source))) {
    throw new Error('Download metadata and publication directories must not overlap.');
  }
  let current = output;
  while (current !== workspace) {
    try {
      const entry = await lstat(current);
      if (entry.isSymbolicLink() || !entry.isDirectory()) {
        throw new Error('The publication output path must contain only ordinary directories.');
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    current = dirname(current);
  }
}

async function readHistoricalMetadata(source) {
  const files = new Map();
  let totalBytes = 0;
  await visit('releases');
  return files;

  async function visit(path) {
    const fullPath = resolve(source, path);
    const entry = await lstat(fullPath);
    if (entry.isSymbolicLink()) {
      throw new Error('Historical release metadata must not contain symbolic links.');
    }
    if (entry.isDirectory()) {
      if (!/^releases(?:\/\d+\.\d+\.\d+(?:\/shared)?)?$/u.test(path)) {
        throw new Error(`Unexpected historical metadata directory: ${path}.`);
      }
      const children = await readdir(fullPath);
      if (children.length > maximumMetadataFiles) {
        throw new Error('Historical metadata exceeds the file count limit.');
      }
      for (const child of children.sort()) await visit(`${path}/${child}`);
      return;
    }
    if (
      !entry.isFile() ||
      !/^releases\/\d+\.\d+\.\d+\/(?:manifest\.json|shared\/symphony\.ico)$/u.test(path)
    ) {
      throw new Error(`Unexpected historical metadata file: ${path}.`);
    }
    totalBytes += entry.size;
    if (totalBytes > maximumMetadataBytes || files.size >= maximumMetadataFiles) {
      throw new Error('Historical metadata exceeds the publication size or file count limit.');
    }
    const bytes = await readFile(fullPath);
    if (path.endsWith('/manifest.json')) {
      const manifest = JSON.parse(bytes.toString('utf8'));
      if (manifest.schemaVersion !== 1 || manifest.version !== path.split('/')[1]) {
        throw new Error(`Historical manifest does not match its version path: ${path}.`);
      }
    }
    files.set(path, bytes);
  }
}

function isOutside(path) {
  return path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await BuildDownloadSite({
    sourceDirectory: process.env['SYMPHONY_PAGES_SOURCE'] ?? 'out/pages-source',
    outputDirectory: process.env['SYMPHONY_PAGES_OUTPUT'] ?? 'out/pages',
  });
  process.stdout.write(`${JSON.stringify({ event: 'download.site.built', ...result })}\n`);
}
