// #region Imports

import { randomUUID } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { parse, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// #endregion

const maximumFileBytes = 1024 * 1024;
const maximumTotalBytes = 64 * 1024 * 1024;
const maximumFileCount = 10000;
const requestTimeoutMs = 15000;
const requestConcurrency = 4;

/**
 * Confirms that every generated site file is publicly served with its exact expected bytes.
 *
 * @param {{outputDirectory: string, baseUrl: string, request?: typeof fetch, attempts?: number, retryDelayMs?: number}} options Generated site and bounded verification settings.
 * @returns {Promise<{fileCount: number, baseUrl: string}>} Verified deployment summary.
 * @public
 */
export async function VerifyPagesDeployment({
  outputDirectory,
  baseUrl,
  request = fetch,
  attempts = 12,
  retryDelayMs = 5000,
}) {
  const origin = validateOrigin(baseUrl);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 12) {
    throw new Error('Pages verification requires between one and twelve attempts.');
  }
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 30000) {
    throw new Error('Pages verification retry delay must be between zero and thirty seconds.');
  }
  const output = resolve(outputDirectory);
  if (output === parse(output).root || output === resolve('.')) {
    throw new Error('Pages verification requires a dedicated site output directory.');
  }
  const outputStat = await lstat(output);
  if (!outputStat.isDirectory() || outputStat.isSymbolicLink()) {
    throw new Error('The Pages output must be a real directory.');
  }
  const expectedFiles = [];
  await collectFiles(output, '', expectedFiles, { entries: 0, bytes: 0 });
  if (!expectedFiles.some((file) => file.path === 'index.html')) {
    throw new Error('The Pages output contains no download page.');
  }

  const deploymentKey = `${process.env['GITHUB_RUN_ID'] ?? 'local'}-${randomUUID()}`;
  let pending = expectedFiles;
  let failures = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const nextPending = [];
    failures = [];
    for (let offset = 0; offset < pending.length; offset += requestConcurrency) {
      const batch = pending.slice(offset, offset + requestConcurrency);
      const results = await Promise.allSettled(
        batch.map((file) => verifyFile(file, origin, `${deploymentKey}-${attempt}`, request)),
      );
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          nextPending.push(batch[index]);
          failures.push(String(result.reason?.message ?? result.reason));
        }
      });
    }
    if (nextPending.length === 0) {
      return { fileCount: expectedFiles.length, baseUrl: origin };
    }
    pending = nextPending;
    if (attempt < attempts) await delay(retryDelayMs);
  }
  throw new Error(`The published Pages files do not match the deployment:\n${failures.join('\n')}`);
}

async function collectFiles(root, directory, files, counts) {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  for (const entry of entries) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    counts.entries += 1;
    if (counts.entries > maximumFileCount * 2 || path.split('/').length > 16) {
      throw new Error('The Pages output exceeds its entry or nesting limits.');
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`The Pages output must not contain symbolic links: ${path}.`);
    }
    if (entry.isDirectory()) {
      await collectFiles(root, path, files, counts);
    } else if (entry.isFile()) {
      const absolutePath = resolve(root, ...path.split('/'));
      const stat = await lstat(absolutePath);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumFileBytes) {
        throw new Error(`The Pages output file is unsafe or exceeds its size limit: ${path}.`);
      }
      const bytes = await readFile(absolutePath);
      counts.bytes += bytes.length;
      files.push({ path, bytes });
      if (
        bytes.length > maximumFileBytes ||
        files.length > maximumFileCount ||
        counts.bytes > maximumTotalBytes
      ) {
        throw new Error('The Pages output exceeds its verification limits.');
      }
    } else {
      throw new Error(`Unsupported Pages output entry: ${path}.`);
    }
  }
}

async function verifyFile(file, origin, deploymentKey, request) {
  const path = file.path.split('/').map(encodeURIComponent).join('/');
  const url = new URL(path, `${origin}/`);
  const installerFeed = file.path.startsWith('channels/') && file.path.endsWith('/installer.json');
  if (!installerFeed) {
    url.searchParams.set('symphony-deployment', deploymentKey);
  }
  let response;
  try {
    response = await request(url, {
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.timeout(requestTimeoutMs),
      ...(installerFeed
        ? { cache: 'no-cache', headers: { Accept: 'application/json' } }
        : { headers: { 'Cache-Control': 'no-cache' } }),
    });
  } catch {
    throw new Error(`The published file could not be fetched: ${file.path}.`);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`The published file returned HTTP ${response.status}: ${file.path}.`);
  }
  const advertisedLength = response.headers.get('content-length');
  if (advertisedLength && Number(advertisedLength) > maximumFileBytes) {
    await response.body?.cancel();
    throw new Error(`The published file exceeds its size limit: ${file.path}.`);
  }
  const reader = response.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > maximumFileBytes) {
          await reader.cancel();
          throw new Error(`The published file exceeds its size limit: ${file.path}.`);
        }
        chunks.push(Buffer.from(chunk.value));
      }
    } finally {
      reader.releaseLock();
    }
  }
  if (!file.bytes.equals(Buffer.concat(chunks))) {
    throw new Error(`The published file has different bytes: ${file.path}.`);
  }
}

function validateOrigin(candidate) {
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Pages verification requires a credential-free HTTPS origin.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Pages verification requires a credential-free HTTPS origin.');
  }
  return url.href.replace(/\/+$/u, '');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await VerifyPagesDeployment({
    outputDirectory: process.env['SYMPHONY_PAGES_OUTPUT'] ?? 'out/pages',
    baseUrl: process.env['SYMPHONY_UPDATE_BASE_URL'] ?? '',
  });
  process.stdout.write(`${JSON.stringify({ event: 'pages.deployment.verified', ...result })}\n`);
}
