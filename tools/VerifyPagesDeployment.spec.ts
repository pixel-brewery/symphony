// #region Imports

import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyPagesDeployment } from './VerifyPagesDeployment.mjs';

// #endregion

let workspace: string;
let outputDirectory: string;
const baseUrl = 'https://pixel-brewery.github.io/symphony';
const installerFeed = 'channels/stable/darwin/arm64/installer.json';
const expectedFiles = new Map([
  ['index.html', Buffer.from('<html>Downloads</html>\n')],
  [installerFeed, Buffer.from('{"version":"0.1.27"}\n')],
  ['releases/0.1.17/manifest.json', Buffer.from('{ "original": true }\n')],
  ['releases/0.1.17/shared/symphony.ico', Buffer.from([0, 0, 1, 0, 255])],
]);

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'symphony-pages-deployment-'));
  outputDirectory = join(workspace, 'site');
  for (const [path, bytes] of expectedFiles) {
    const segments = path.split('/');
    await mkdir(join(outputDirectory, ...segments.slice(0, -1)), { recursive: true });
    await writeFile(join(outputDirectory, path), bytes);
  }
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function requestPath(input: Parameters<typeof fetch>[0]): string {
  return new URL(String(input)).pathname.replace('/symphony/', '');
}

function matchingResponse(input: Parameters<typeof fetch>[0]): Response {
  const bytes = expectedFiles.get(requestPath(input));
  return new Response(bytes ? new Uint8Array(bytes) : undefined, { status: bytes ? 200 : 404 });
}

describe('public Pages deployment verification', () => {
  it('verifies every page, channel and historical file without sending credentials', async () => {
    // arrange
    const request = vi.fn(async (...args: Parameters<typeof fetch>) => matchingResponse(args[0]));

    // act
    const result = await VerifyPagesDeployment({
      outputDirectory,
      baseUrl,
      request,
      attempts: 1,
    });

    // assert
    expect(result).toEqual({ baseUrl, fileCount: expectedFiles.size });
    expect(new Set(request.mock.calls.map(([input]) => requestPath(input)))).toEqual(
      new Set(expectedFiles.keys()),
    );
    for (const [input, options] of request.mock.calls) {
      expect(options?.redirect).toBe('error');
      expect(options?.credentials).toBe('omit');
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      if (requestPath(input) === installerFeed) {
        expect(String(input)).toBe(`${baseUrl}/${installerFeed}`);
        expect(options?.cache).toBe('no-cache');
        expect(options?.headers).toEqual({ Accept: 'application/json' });
      } else {
        expect(new URL(String(input)).searchParams.has('symphony-deployment')).toBe(true);
        expect(options?.headers).toEqual({ 'Cache-Control': 'no-cache' });
      }
    }
  });

  it('rejects publication while the canonical installer feed still returns the old version', async () => {
    const request = vi.fn(async (input: Parameters<typeof fetch>[0]) =>
      String(input) === `${baseUrl}/${installerFeed}`
        ? new Response('{"version":"0.1.26"}')
        : matchingResponse(input),
    );

    const operation = VerifyPagesDeployment({
      outputDirectory,
      baseUrl,
      request,
      attempts: 2,
      retryDelayMs: 0,
    });

    await expect(operation).rejects.toThrow(`different bytes: ${installerFeed}`);
    expect(request.mock.calls.filter(([input]) => requestPath(input) === installerFeed)).toEqual([
      [new URL(`${baseUrl}/${installerFeed}`), expect.anything()],
      [new URL(`${baseUrl}/${installerFeed}`), expect.anything()],
    ]);
  });

  it('rejects a changed historical manifest even when the download page matches', async () => {
    // arrange
    const request = vi.fn(async (...args: Parameters<typeof fetch>) =>
      requestPath(args[0]) === 'releases/0.1.17/manifest.json'
        ? new Response('{"rewritten":true}')
        : matchingResponse(args[0]),
    );

    // act
    const operation = VerifyPagesDeployment({ outputDirectory, baseUrl, request, attempts: 1 });

    // assert
    await expect(operation).rejects.toThrow(/different bytes: releases\/0\.1\.17\/manifest\.json/u);
  });

  it('retries only files that are not yet available and changes the cache key', async () => {
    // arrange
    let pageCalls = 0;
    const request = vi.fn(async (...args: Parameters<typeof fetch>) => {
      if (requestPath(args[0]) === 'index.html' && pageCalls++ === 0) {
        return new Response('Old cached page');
      }
      return matchingResponse(args[0]);
    });

    // act
    const result = await VerifyPagesDeployment({
      outputDirectory,
      baseUrl,
      request,
      attempts: 2,
      retryDelayMs: 0,
    });

    // assert
    expect(result.fileCount).toBe(expectedFiles.size);
    expect(request).toHaveBeenCalledTimes(expectedFiles.size + 1);
    const pageUrls = request.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith('/index.html'));
    expect(pageUrls[0]?.search).not.toBe(pageUrls[1]?.search);
  });

  it('reports an unavailable file after exhausting the bounded attempts', async () => {
    // arrange
    const request = vi.fn(async () => new Response('Unavailable', { status: 503 }));

    // act
    const operation = VerifyPagesDeployment({ outputDirectory, baseUrl, request, attempts: 1 });

    // assert
    await expect(operation).rejects.toThrow(/HTTP 503: index\.html/u);
  });

  it('rejects an oversized remote response before comparing bytes', async () => {
    // arrange
    const request = vi.fn(
      async () =>
        new Response('oversized', { headers: { 'content-length': String(1024 * 1024 + 1) } }),
    );

    // act
    const operation = VerifyPagesDeployment({ outputDirectory, baseUrl, request, attempts: 1 });

    // assert
    await expect(operation).rejects.toThrow(/exceeds its size limit/u);
  });

  it.each([
    'http://pixel-brewery.github.io/symphony',
    'https://token@pixel-brewery.github.io/symphony',
    'https://pixel-brewery.github.io/symphony?token=secret',
  ])('rejects an unsuitable public origin before making requests: %s', async (origin) => {
    // arrange
    const request = vi.fn(async () => new Response('irrelevant'));

    // act
    const operation = VerifyPagesDeployment({
      outputDirectory,
      baseUrl: origin,
      request,
      attempts: 1,
    });

    // assert
    await expect(operation).rejects.toThrow(/credential-free HTTPS origin/u);
    expect(request).not.toHaveBeenCalled();
  });

  it.skipIf(process.platform === 'win32')(
    'refuses to verify files reached through symbolic links',
    async () => {
      // arrange
      await symlink(join(outputDirectory, 'index.html'), join(outputDirectory, 'linked.html'));
      const request = vi.fn(async () => new Response('irrelevant'));

      // act
      const operation = VerifyPagesDeployment({ outputDirectory, baseUrl, request, attempts: 1 });

      // assert
      await expect(operation).rejects.toThrow(/must not contain symbolic links/u);
      expect(request).not.toHaveBeenCalled();
    },
  );
});
