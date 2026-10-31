// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RunnerImageCatalogService } from './RunnerImageCatalogService';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function cacheRoot(): string {
  const directory = mkdtempSync(join(tmpdir(), 'runner-image-catalog-'));
  temporaryDirectories.push(directory);
  return directory;
}

const releases = [
  {
    tag_name: 'ubuntu24-arm64/20260817.96',
    published_at: '2026-08-17T10:00:00Z',
    assets: [
      {
        name: 'internal.ubuntu24-arm64.json',
        browser_download_url: 'https://example.invalid/report-arm64.json',
      },
      { name: 'sbom.ubuntu-24.04-arm.json.zip', browser_download_url: 'https://example.invalid/s' },
    ],
  },
  {
    tag_name: 'ubuntu24-arm64/20260810.88',
    published_at: '2026-08-10T10:00:00Z',
    assets: [
      {
        name: 'internal.ubuntu24-arm64.json',
        browser_download_url: 'https://example.invalid/report-arm64-old.json',
      },
    ],
  },
  {
    tag_name: 'ubuntu24/20260816.277',
    published_at: '2026-08-16T10:00:00Z',
    assets: [
      {
        name: 'internal.ubuntu24.json',
        browser_download_url: 'https://example.invalid/report-x64.json',
      },
    ],
  },
  { tag_name: 'win25/20260818.232', published_at: '2026-08-18T10:00:00Z', assets: [] },
];

/** Mirrors the node shape GitHub publishes in `internal.<image>.json`. */
const report = {
  NodeType: 'HeaderNode',
  Title: 'Ubuntu 24.04',
  Children: [
    {
      NodeType: 'HeaderNode',
      Title: 'Language and Runtime',
      Children: [
        { NodeType: 'ToolVersionNode', ToolName: 'Node.js', Version: '22.23.2' },
        { NodeType: 'ToolVersionNode', ToolName: 'Python', Version: '3.12.3' },
      ],
    },
    {
      NodeType: 'HeaderNode',
      Title: 'Browsers and Drivers',
      Children: [
        {
          NodeType: 'HeaderNode',
          Title: 'Environment variables',
          Children: {
            NodeType: 'TableNode',
            Headers: 'Name|Value',
            Rows: [
              'CHROMEWEBDRIVER|',
              'GECKOWEBDRIVER|/usr/local/share/gecko_driver',
              'not a name|value',
            ],
          },
        },
      ],
    },
    {
      NodeType: 'HeaderNode',
      Title: 'Installed apt packages',
      Children: {
        NodeType: 'TableNode',
        Headers: 'Name|Version',
        Rows: ['jq|1.7.1-3ubuntu0.24.04.2', 'xvfb|2:21.1.12-1', 'libgbm-dev|25.2.8-0'],
      },
    },
  ],
};

const nodeChecksums = [
  '0000000000000000000000000000000000000000000000000000000000000001  node-v22.23.2-linux-x64.tar.xz',
  '0000000000000000000000000000000000000000000000000000000000000002  node-v22.23.2-linux-arm64.tar.xz',
].join('\n');

const cloudListing = `
<a href="release-20260618/">release-20260618/</a>
<a href="release-20260725/">release-20260725/</a>
<a href="release/">release/</a>
`;

const cloudChecksums = [
  '0000000000000000000000000000000000000000000000000000000000000003 *ubuntu-24.04-server-cloudimg-arm64.img',
].join('\n');

function stubFetch(overrides: Record<string, string> = {}): {
  readonly fetch: typeof fetch;
  readonly calls: string[];
} {
  const calls: string[] = [];
  const bodies: Record<string, string> = {
    'api.github.com': JSON.stringify(releases),
    'report-arm64.json': JSON.stringify(report),
    'SHASUMS256.txt': nodeChecksums,
    'release-20260725/SHA256SUMS': cloudChecksums,
    'releases/noble/': cloudListing,
    ...overrides,
  };
  const implementation = (async (input: string | URL) => {
    const url = String(input);
    calls.push(url);
    const key = Object.keys(bodies).find((candidate) => url.includes(candidate));
    if (!key) return new Response('not found', { status: 404 });
    return new Response(bodies[key], { status: 200 });
  }) as unknown as typeof fetch;
  return { fetch: implementation, calls };
}

describe('RunnerImageCatalogService', () => {
  it('lists only Ubuntu releases and marks the newest per family and architecture', async () => {
    // arrange
    const service = new RunnerImageCatalogService({
      fetch: stubFetch().fetch,
      clock: () => new Date('2026-08-21T20:00:00.000Z'),
    });

    const catalog = await service.catalog(cacheRoot(), new AbortController().signal);

    // act
    const actual = catalog.entries.map((entry) => entry.releaseTag);

    // assert
    expect(actual).toEqual([
      'ubuntu24-arm64/20260817.96',
      'ubuntu24/20260816.277',
      'ubuntu24-arm64/20260810.88',
    ]);
    expect(
      catalog.entries.filter((entry) => entry.latest).map((entry) => entry.releaseTag),
    ).toEqual(['ubuntu24-arm64/20260817.96', 'ubuntu24/20260816.277']);
    expect(catalog.entries[0]).toMatchObject({
      architecture: 'arm64',
      family: 'ubuntu24',
      ubuntuVersion: '24.04',
      imageVersion: '20260817.96',
    });
  });

  it('resolves a release into a pinned, reproducible guest definition', async () => {
    // arrange
    const service = new RunnerImageCatalogService({
      fetch: stubFetch().fetch,
      clock: () => new Date('2026-08-21T20:00:00.000Z'),
    });
    const root = cacheRoot();
    const catalog = await service.catalog(root, new AbortController().signal);
    const entry = catalog.entries.find((candidate) => candidate.architecture === 'arm64');

    // act
    const definition = await service.resolveDefinition(entry!, new AbortController().signal);

    // assert
    expect(definition).toMatchObject({
      releaseTag: 'ubuntu24-arm64/20260817.96',
      architecture: 'arm64',
      ubuntuVersion: '24.04',
      ubuntuCodename: 'noble',
      cloudImageRelease: '20260725',
      cloudImageFile: 'ubuntu-24.04-server-cloudimg-arm64.img',
      cloudImageSha256: '0000000000000000000000000000000000000000000000000000000000000003',
      aptPackages: ['jq', 'libgbm-dev', 'xvfb'],
      nodeVersion: '22.23.2',
      nodeArchive: 'node-v22.23.2-linux-arm64.tar.xz',
      nodeSha256: '0000000000000000000000000000000000000000000000000000000000000002',
      environment: { GECKOWEBDRIVER: '/usr/local/share/gecko_driver' },
    });
  });

  it('serves the cached catalog when the upstream refresh fails', async () => {
    // arrange
    const root = cacheRoot();
    const working = new RunnerImageCatalogService({
      fetch: stubFetch().fetch,
      clock: () => new Date('2026-08-21T20:00:00.000Z'),
    });
    await working.catalog(root, new AbortController().signal);

    const failing = new RunnerImageCatalogService({
      fetch: (async () => new Response('rate limited', { status: 403 })) as unknown as typeof fetch,
      clock: () => new Date('2026-08-23T20:00:00.000Z'),
    });
    // act
    const catalog = await failing.catalog(root, new AbortController().signal);

    // assert
    expect(catalog.entries).toHaveLength(3);
    expect(catalog.staleReason).toMatch(/HTTP 403/u);
  });

  it('reuses a fresh cache instead of calling GitHub again', async () => {
    // arrange
    const root = cacheRoot();
    const first = stubFetch();
    const service = new RunnerImageCatalogService({
      fetch: first.fetch,
      clock: () => new Date('2026-08-21T20:00:00.000Z'),
    });
    await service.catalog(root, new AbortController().signal);
    const callsAfterFirst = first.calls.length;
    // act
    await service.catalog(root, new AbortController().signal);

    // assert
    expect(first.calls).toHaveLength(callsAfterFirst);
  });
});
