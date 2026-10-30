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
});
