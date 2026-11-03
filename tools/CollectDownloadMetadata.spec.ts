// #region Imports

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectDownloadMetadata } from './CollectDownloadMetadata.mjs';

// #endregion

const repository = 'pixel-brewery/symphony';
const apiRoot = `https://api.github.com/repos/${repository}`;
const publicRoot = `https://github.com/${repository}`;

interface IFixtureAsset {
  id: number;
  name: string;
  size: number;
  state: string;
  digest: string;
  url: string;
  browser_download_url: string;
}

interface IFixtureRelease {
  id: number;
  tag_name: string;
  url: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: IFixtureAsset[];
}

interface IFixtureManifest {
  schemaVersion: number;
  version: string;
  sourceCommit: string;
  createdAt: string;
  files: Array<{
    platform: string;
    architecture: string;
    name: string;
    bytes: number;
    sha256: string;
    url: string;
  }>;
}

interface IFixture {
  release: IFixtureRelease;
  manifest: IFixtureManifest;
  manifestBytes: Buffer;
  iconBytes: Buffer;
}

interface IReply {
  bytes?: Buffer;
  json?: unknown;
  status?: number;
  headers?: Record<string, string>;
}

let workspace: string;
let outputDirectory: string;
let replies: Map<string, IReply>;
let nextAssetId: number;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'symphony-pages-collection-'));
  outputDirectory = join(workspace, 'source');
  replies = new Map();
  nextAssetId = 1;
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function createFixture(version: string, id: number, withMetadata = true): IFixture {
  const files = [
    ['darwin', `Symphony-darwin-arm64-${version}.dmg`],
    ['win32', 'SymphonySetup.exe'],
    ['linux', `symphony_${version}_arm64.deb`],
  ].map(([platform, name]) => ({
    platform: platform ?? '',
    architecture: 'arm64',
    name: name ?? '',
    bytes: 1234,
    sha256: sha256(Buffer.from(`${version}-${platform}`)),
    url: `${publicRoot}/releases/download/v${version}/${name}`,
  }));
  const manifest = {
    schemaVersion: 1,
    version,
    sourceCommit: 'a'.repeat(40),
    createdAt: '2026-11-03T01:23:45.678Z',
    files,
  };
  const release = {
    id,
    tag_name: `v${version}`,
    url: `${apiRoot}/releases/${id}`,
    html_url: `${publicRoot}/releases/tag/v${version}`,
    published_at: '2026-11-03T02:00:00Z',
    draft: false,
    prerelease: false,
    assets: files.map((file) => {
      const assetId = nextAssetId++;
      return {
        id: assetId,
        name: file.name,
        state: 'uploaded',
        size: file.bytes,
        digest: `sha256:${file.sha256}`,
        url: `${apiRoot}/releases/assets/${assetId}`,
        browser_download_url: file.url,
      };
    }),
  };
  const fixture = {
    release,
    manifest,
    manifestBytes: Buffer.from(`${JSON.stringify(manifest, undefined, 2)}\n`),
    iconBytes: Buffer.from(`preserved-icon-${version}`),
  };
  if (withMetadata) {
    addMetadata(fixture, 'manifest.json', fixture.manifestBytes);
    addMetadata(fixture, 'symphony.ico', fixture.iconBytes);
  }
  return fixture;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function addMetadata(fixture: IFixture, name: string, bytes: Buffer): IFixtureAsset {
  const id = nextAssetId++;
  const asset = {
    id,
    name,
    state: 'uploaded',
    size: bytes.length,
    digest: `sha256:${sha256(bytes)}`,
    url: `${apiRoot}/releases/assets/${id}`,
    browser_download_url: `${publicRoot}/releases/download/${fixture.release.tag_name}/${name}`,
  };
  fixture.release.assets.push(asset);
  replies.set(asset.url, { bytes });
  return asset;
}

function historyFiles(...fixtures: IFixture[]): Array<{ path: string; data: string }> {
  return fixtures.flatMap((fixture) => [
    {
      path: `releases/${fixture.manifest.version}/manifest.json`,
      data: fixture.manifestBytes.toString('base64'),
    },
    {
      path: `releases/${fixture.manifest.version}/shared/symphony.ico`,
      data: fixture.iconBytes.toString('base64'),
    },
  ]);
}

function addHistory(host: IFixture, files: Array<{ path: string; data: string }>): IFixtureAsset {
  return addMetadata(
    host,
    'symphony-pages-history.json',
    Buffer.from(JSON.stringify({ schemaVersion: 1, files })),
  );
}

function createRequest(releases: IFixtureRelease[], latest = releases[0]) {
  replies.set(`${apiRoot}/releases?per_page=100&page=1`, { json: releases });
  replies.set(`${apiRoot}/releases/latest`, { json: latest });
  return vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
    if (options?.method && options.method !== 'GET') {
      throw new Error('Metadata collection must only read GitHub.');
    }
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const reply = replies.get(url);
    if (!reply) throw new Error(`Unexpected request: ${url}`);
    const bytes = reply.bytes ?? Buffer.from(JSON.stringify(reply.json));
    return new Response(new Uint8Array(bytes), {
      status: reply.status ?? 200,
      headers: reply.headers,
    });
  });
}

describe('CollectDownloadMetadata', () => {
  it.each([process.cwd(), dirname(process.cwd())])(
    'rejects workspace ancestor %s before making requests',
    async (ancestor) => {
      // arrange
      const request = createRequest([]);

      // act
      const collection = CollectDownloadMetadata({ outputDirectory: ancestor, request });

      // assert
      await expect(collection).rejects.toThrow(/not a workspace ancestor/u);
      expect(request).not.toHaveBeenCalled();
    },
  );

  it('keeps an explicit older Stable selection while sorting Canary by numeric version', async () => {
    // arrange
    const older = createFixture('0.1.9', 1);
    const newer = createFixture('0.1.10', 2);
    const draft = createFixture('0.1.11', 3, false);
    draft.release.draft = true;
    const prerelease = createFixture('0.1.12', 4, false);
    prerelease.release.prerelease = true;
    const request = createRequest(
      [older.release, draft.release, newer.release, prerelease.release],
      older.release,
    );

    // act
    await CollectDownloadMetadata({ outputDirectory, token: 'test-token', request });
    const catalog = JSON.parse(readFileSync(join(outputDirectory, 'catalog.json'), 'utf8'));

    // assert
    expect(catalog).toMatchObject({ schemaVersion: 1, stable: '0.1.9', canary: '0.1.10' });
    expect(catalog.releases.map((release: { version: string }) => release.version)).toEqual([
      '0.1.10',
      '0.1.9',
    ]);
    expect(catalog.releases[0]).toEqual({
      version: '0.1.10',
      htmlUrl: newer.release.html_url,
      publishedAt: newer.release.published_at,
      manifest: newer.manifest,
    });
    expect(readFileSync(join(outputDirectory, 'releases/0.1.10/manifest.json'))).toEqual(
      newer.manifestBytes,
    );
    expect(readFileSync(join(outputDirectory, 'releases/0.1.9/shared/symphony.ico'))).toEqual(
      older.iconBytes,
    );
    expect(existsSync(join(outputDirectory, 'releases/0.1.11'))).toBe(false);
    expect(request.mock.calls.every(([url]) => String(url).startsWith(apiRoot))).toBe(true);
    expect(request.mock.calls.every(([, options]) => options?.redirect === 'manual')).toBe(true);
  });

  it('preserves old draft-version URLs from history without advertising or publishing those drafts', async () => {
    // arrange
    const legacy = createFixture('0.1.17', 1, false);
    legacy.release.draft = true;
    const published = createFixture('0.1.27', 2, false);
    addHistory(published, historyFiles(legacy, published));
    const request = createRequest([legacy.release, published.release], published.release);

    // act
    await CollectDownloadMetadata({ outputDirectory, request });
    const catalog = JSON.parse(readFileSync(join(outputDirectory, 'catalog.json'), 'utf8'));

    // assert
    expect(readFileSync(join(outputDirectory, 'releases/0.1.17/manifest.json'))).toEqual(
      legacy.manifestBytes,
    );
    expect(readFileSync(join(outputDirectory, 'releases/0.1.17/shared/symphony.ico'))).toEqual(
      legacy.iconBytes,
    );
    expect(catalog.releases.map((release: { version: string }) => release.version)).toEqual([
      '0.1.27',
    ]);
    expect(
      request.mock.calls.every(([, options]) => !options?.method || options.method === 'GET'),
    ).toBe(true);
  });

  it('deduplicates identical migration archives and individual metadata across several releases', async () => {
    // arrange
    const first = createFixture('0.1.26', 1);
    const second = createFixture('0.1.27', 2);
    addHistory(first, historyFiles(first, second));
    addHistory(second, historyFiles(first, second));
    const request = createRequest([first.release, second.release], second.release);

    // act
    await CollectDownloadMetadata({ outputDirectory, request });

    // assert
    expect(readFileSync(join(outputDirectory, 'releases/0.1.26/manifest.json'))).toEqual(
      first.manifestBytes,
    );
    expect(readFileSync(join(outputDirectory, 'releases/0.1.27/manifest.json'))).toEqual(
      second.manifestBytes,
    );
  });

  it('fails on conflicting published bytes before replacing the previous generated output', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const files = historyFiles(published);
    files[1] = {
      path: 'releases/0.1.27/shared/symphony.ico',
      data: Buffer.from('different-icon').toString('base64'),
    };
    addHistory(published, files);
    const request = createRequest([published.release]);
    mkdirSync(outputDirectory);
    writeFileSync(join(outputDirectory, 'sentinel.txt'), 'keep previous output');

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('Published metadata bytes conflict');
    expect(readFileSync(join(outputDirectory, 'sentinel.txt'), 'utf8')).toBe(
      'keep previous output',
    );
  });

  it('refuses a public numeric release that has no durable metadata rather than falling back to an older version', async () => {
    // arrange
    const older = createFixture('0.1.26', 1);
    const missing = createFixture('0.1.27', 2, false);
    const request = createRequest([older.release, missing.release], older.release);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow(
      'Public release 0.1.27 has no durable version metadata.',
    );
    expect(existsSync(outputDirectory)).toBe(false);
  });

  it('requires both metadata assets for a new release', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    published.release.assets = published.release.assets.filter(
      (asset) => asset.name !== 'symphony.ico',
    );
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('incomplete metadata asset pair');
  });

  it('rejects a release whose advertised installer digest differs from GitHub metadata', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const installer = published.release.assets.find((asset) => asset.name === 'SymphonySetup.exe');
    if (!installer) throw new Error('Missing fixture installer.');
    installer.digest = `sha256:${'b'.repeat(64)}`;
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('unexpected SHA-256 digest');
  });

  it('rejects Latest when it does not identify a complete release in the catalog', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const absent = createFixture('0.1.26', 2);
    const request = createRequest([published.release], absent.release);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('Latest does not select a complete release');
  });

  it.each([
    '../catalog.json',
    'releases/0.1.27/../../catalog.json',
    'releases/0.1.27/manifest.json/',
  ])('rejects the history path %s before writing', async (path) => {
    // arrange
    const published = createFixture('0.1.27', 1);
    addHistory(published, [{ path, data: Buffer.from('{}').toString('base64') }]);
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('unsupported file path');
    expect(existsSync(outputDirectory)).toBe(false);
  });

  it('rejects a noncanonical base64 history file', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    addHistory(published, [{ path: 'releases/0.1.27/manifest.json', data: '{}not-base64' }]);
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('invalid base64 metadata');
  });

  it('rejects an installer URL outside the canonical repository', async () => {
    // arrange
    const published = createFixture('0.1.27', 1, false);
    const file = published.manifest.files[0];
    if (!file) throw new Error('Missing fixture file.');
    file.url = 'https://example.com/untrusted-installer.dmg';
    addMetadata(published, 'manifest.json', Buffer.from(JSON.stringify(published.manifest)));
    addMetadata(published, 'symphony.ico', published.iconBytes);
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('contains an invalid installer');
    expect(request.mock.calls.some(([url]) => String(url).includes('example.com'))).toBe(false);
  });

  it('verifies downloaded metadata against the uploaded asset digest', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const metadata = published.release.assets.find((asset) => asset.name === 'manifest.json');
    if (!metadata) throw new Error('Missing fixture metadata.');
    metadata.digest = `sha256:${'b'.repeat(64)}`;
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('does not match its GitHub size and digest');
  });

  it.each(['url', 'state', 'size'])(
    'rejects invalid metadata asset %s before requesting it',
    async (field) => {
      // arrange
      const published = createFixture('0.1.27', 1);
      const metadata = published.release.assets.find((asset) => asset.name === 'manifest.json');
      if (!metadata) throw new Error('Missing fixture metadata.');
      if (field === 'url') metadata.url = 'https://example.com/private';
      if (field === 'state') metadata.state = 'new';
      if (field === 'size') metadata.size = 256 * 1024 + 1;
      const request = createRequest([published.release]);

      // act
      const collection = CollectDownloadMetadata({ outputDirectory, request });

      // assert
      await expect(collection).rejects.toThrow('metadata asset has invalid');
      expect(request.mock.calls.some(([url]) => String(url).includes('example.com'))).toBe(false);
    },
  );

  it('stops an oversized streamed manifest even without a Content-Length header', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const metadata = published.release.assets.find((asset) => asset.name === 'manifest.json');
    if (!metadata) throw new Error('Missing fixture metadata.');
    replies.set(metadata.url, { bytes: Buffer.alloc(256 * 1024 + 1) });
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({ outputDirectory, request });

    // assert
    await expect(collection).rejects.toThrow('response exceeds its size limit');
  });

  it('follows GitHub asset redirects without forwarding the repository token', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const metadata = published.release.assets.find((asset) => asset.name === 'manifest.json');
    if (!metadata) throw new Error('Missing fixture metadata.');
    const downloadUrl = 'https://release-assets.githubusercontent.com/asset?signature=test';
    replies.set(metadata.url, {
      bytes: Buffer.alloc(0),
      status: 302,
      headers: { location: downloadUrl },
    });
    replies.set(downloadUrl, { bytes: published.manifestBytes });
    const request = createRequest([published.release]);

    // act
    await CollectDownloadMetadata({ outputDirectory, token: 'secret-test-token', request });

    // assert
    const apiCall = request.mock.calls.find(([url]) => url === metadata.url);
    const assetCall = request.mock.calls.find(([url]) => url === downloadUrl);
    expect(new Headers(apiCall?.[1]?.headers).get('authorization')).toBe(
      'Bearer secret-test-token',
    );
    expect(new Headers(assetCall?.[1]?.headers).get('authorization')).toBeNull();
  });

  it('rejects an untrusted metadata redirect without making the redirected request', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const metadata = published.release.assets.find((asset) => asset.name === 'manifest.json');
    if (!metadata) throw new Error('Missing fixture metadata.');
    replies.set(metadata.url, {
      bytes: Buffer.alloc(0),
      status: 302,
      headers: { location: 'https://example.com/metadata' },
    });
    const request = createRequest([published.release]);

    // act
    const collection = CollectDownloadMetadata({
      outputDirectory,
      token: 'secret-test-token',
      request,
    });

    // assert
    await expect(collection).rejects.toThrow('untrusted metadata redirect');
    expect(request.mock.calls.some(([url]) => String(url).includes('example.com'))).toBe(false);
  });

  it('collects releases after the first full API page', async () => {
    // arrange
    const published = createFixture('0.1.27', 1);
    const request = createRequest([published.release]);
    replies.set(`${apiRoot}/releases?per_page=100&page=1`, {
      json: Array.from({ length: 100 }, (_, index) => ({
        tag_name: `other-release-${index}`,
        draft: false,
        prerelease: false,
      })),
    });
    replies.set(`${apiRoot}/releases?per_page=100&page=2`, { json: [published.release] });

    // act
    await CollectDownloadMetadata({ outputDirectory, request });

    // assert
    expect(
      request.mock.calls.some(([url]) => url === `${apiRoot}/releases?per_page=100&page=2`),
    ).toBe(true);
    expect(JSON.parse(readFileSync(join(outputDirectory, 'catalog.json'), 'utf8')).canary).toBe(
      '0.1.27',
    );
  });
});
