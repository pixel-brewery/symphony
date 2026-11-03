// #region Imports

import { describe, expect, it } from 'vitest';
import { VerifyPublishedReleaseAssets } from './VerifyPublishedReleaseAssets.mjs';

// #endregion

const version = '1.2.3';
const name = 'SymphonySetup.exe';
const url = `https://github.com/owner/symphony/releases/download/v${version}/${name}`;
const sha256 = 'a'.repeat(64);
const manifest = {
  version,
  files: [{ name, bytes: 42, sha256, url }],
};

describe('published release assets', () => {
  it('accepts the authenticated GitHub metadata for every advertised artifact', () => {
    // arrange
    const release = {
      tag_name: `v${version}`,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release);

    // assert
    expect(failures).toEqual([]);
  });

  it('rejects a missing or different published artifact', () => {
    // arrange
    const release = {
      tag_name: `v${version}`,
      assets: [
        {
          name,
          size: 41,
          state: 'new',
          digest: `sha256:${'b'.repeat(64)}`,
          browser_download_url: `${url}.missing`,
        },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release);

    // assert
    expect(failures).toEqual([
      `GitHub release asset ${name} is not fully uploaded.`,
      `GitHub release asset ${name} has an unexpected byte count.`,
      `GitHub release asset ${name} has an unexpected SHA-256 digest.`,
      `GitHub release asset ${name} does not match its advertised URL.`,
    ]);
  });

  it('rejects release assets that are not advertised by the manifest', () => {
    // arrange
    const release = {
      tag_name: `v${version}`,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
        { name: `symphony-${version}-full.nupkg` },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release);

    // assert
    expect(failures).toEqual([
      `GitHub release asset symphony-${version}-full.nupkg is not part of the release manifest.`,
    ]);
  });

  it('accepts only the three named durable metadata assets alongside the installers', () => {
    // arrange
    const release = {
      tag_name: `v${version}`,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
        ...['manifest.json', 'symphony.ico', 'symphony-pages-history.json'].map((metadataName) => ({
          name: metadataName,
          size: 12,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
        })),
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release);

    // assert
    expect(failures).toEqual([]);
  });

  it('rejects incomplete metadata and files that merely resemble an allowed metadata name', () => {
    // arrange
    const release = {
      tag_name: `v${version}`,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
        { name: 'manifest.json', size: 0, state: 'new', digest: null },
        { name: 'manifest.json.bak', size: 12, state: 'uploaded' },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release);

    // assert
    expect(failures).toEqual([
      'GitHub metadata asset manifest.json is not fully uploaded.',
      'GitHub metadata asset manifest.json has an invalid byte count.',
      'GitHub metadata asset manifest.json has an invalid SHA-256 digest.',
      'GitHub release asset manifest.json.bak is not part of the release manifest.',
    ]);
  });

  it('rejects duplicate durable metadata assets', () => {
    // arrange
    const metadata = {
      name: 'manifest.json',
      size: 12,
      state: 'uploaded',
      digest: `sha256:${sha256}`,
    };
    const release = {
      tag_name: `v${version}`,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
        metadata,
        metadata,
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release);

    // assert
    expect(failures).toContain(
      'GitHub must publish exactly one metadata asset named manifest.json.',
    );
  });

  it.each([
    `https://github.com/owner/symphony/releases/download/untagged-047bb0a226e026577ad9/${name}`,
    url,
  ])('accepts the draft asset URL %s only through explicit draft verification', (downloadUrl) => {
    // arrange
    const release = {
      id: 420123456,
      tag_name: `v${version}`,
      draft: true,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: downloadUrl,
        },
        { name: 'manifest.json', size: 12, state: 'uploaded', digest: `sha256:${sha256}` },
        { name: 'symphony.ico', size: 12, state: 'uploaded', digest: `sha256:${sha256}` },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release, { allowDraft: true });

    // assert
    expect(failures).toEqual([]);
  });

  it('rejects a draft in public verification even when GitHub already supplies canonical URLs', () => {
    // arrange
    const release = {
      id: 420123456,
      tag_name: `v${version}`,
      draft: true,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release);

    // assert
    expect(failures).toEqual(['Draft GitHub releases cannot pass public asset verification.']);
  });

  it.each([undefined, 0, -1, 1.5])('rejects the draft release ID %s', (id) => {
    // arrange
    const release = {
      id,
      tag_name: `v${version}`,
      draft: true,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release, { allowDraft: true });

    // assert
    expect(failures).toEqual(['Draft asset verification requires a positive numeric release ID.']);
  });

  it('requires draft mode to identify a draft with the exact requested version tag', () => {
    // arrange
    const release = {
      id: 420123456,
      tag_name: 'v9.9.9',
      draft: false,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: url,
        },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release, { allowDraft: true });

    // assert
    expect(failures).toEqual([
      `The GitHub release tag v9.9.9 does not match version ${version}.`,
      'Draft asset verification requires a draft GitHub release.',
    ]);
  });

  it('keeps byte count, digest, upload state and extra-asset checks in draft mode', () => {
    // arrange
    const release = {
      id: 420123456,
      tag_name: `v${version}`,
      draft: true,
      assets: [
        {
          name,
          size: 41,
          state: 'new',
          digest: `sha256:${'b'.repeat(64)}`,
          browser_download_url: `https://github.com/owner/symphony/releases/download/untagged-047bb0a226e026577ad9/${name}`,
        },
        { name: 'arbitrary-extra.zip' },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release, { allowDraft: true });

    // assert
    expect(failures).toEqual([
      `GitHub release asset ${name} is not fully uploaded.`,
      `GitHub release asset ${name} has an unexpected byte count.`,
      `GitHub release asset ${name} has an unexpected SHA-256 digest.`,
      'GitHub release asset arbitrary-extra.zip is not part of the release manifest.',
    ]);
  });

  it.each([
    `https://github.com/other-owner/symphony/releases/download/untagged-047bb0a226e026577ad9/${name}`,
    `https://github.com/owner/other-repository/releases/download/untagged-047bb0a226e026577ad9/${name}`,
    `https://github.com/owner/symphony/releases/download/untagged-not-a-hash/${name}`,
    `https://github.com/owner/symphony/releases/download/untagged-047bb0a226e026577ad9/${name}.zip`,
    `https://github.com/owner/symphony/releases/download/untagged-047bb0a226e026577ad9/nested/${name}`,
    `https://github.com/owner/symphony/releases/download/v9.9.9/${name}`,
    `https://github.com/owner/symphony/releases/download/untagged-047bb0a226e026577ad9/${name}?token=secret`,
    `http://github.com/owner/symphony/releases/download/untagged-047bb0a226e026577ad9/${name}`,
    `https://user:password@github.com/owner/symphony/releases/download/untagged-047bb0a226e026577ad9/${name}`,
  ])('rejects a foreign or noncanonical draft asset URL: %s', (downloadUrl) => {
    // arrange
    const release = {
      id: 420123456,
      tag_name: `v${version}`,
      draft: true,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: downloadUrl,
        },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(manifest, release, { allowDraft: true });

    // assert
    expect(failures).toEqual([`GitHub release asset ${name} does not match its advertised URL.`]);
  });

  it('derives the draft repository only from a canonical GitHub version-manifest URL', () => {
    // arrange
    const foreignManifest = {
      ...manifest,
      files: [{ name, bytes: 42, sha256, url: 'https://example.com/installer.exe' }],
    };
    const release = {
      id: 420123456,
      tag_name: `v${version}`,
      draft: true,
      assets: [
        {
          name,
          size: 42,
          state: 'uploaded',
          digest: `sha256:${sha256}`,
          browser_download_url: 'https://example.com/installer.exe',
        },
      ],
    };

    // act
    const failures = VerifyPublishedReleaseAssets(foreignManifest, release, { allowDraft: true });

    // assert
    expect(failures).toEqual([`GitHub release asset ${name} does not match its advertised URL.`]);
  });
});
