// #region Imports

import { describe, expect, it } from 'vitest';
import type { IRunnerImageDefinition } from '@symphony/domain-core';
import { guestFingerprint } from './guestFingerprint';

// #endregion

const image: IRunnerImageDefinition = {
  releaseTag: 'ubuntu24-arm64/20260817.96',
  architecture: 'arm64',
  ubuntuVersion: '24.04',
  ubuntuCodename: 'noble',
  cloudImageRelease: '20260725',
  cloudImageFile: 'ubuntu-24.04-server-cloudimg-arm64.img',
  cloudImageSha256: 'a'.repeat(64),
  aptPackages: ['jq', 'xvfb'],
  nodeVersion: '24.15.0',
  nodeArchive: 'node-v24.15.0-linux-arm64.tar.xz',
  nodeSha256: 'b'.repeat(64),
  environment: {},
  resolvedAt: '2026-08-21T20:00:00.000Z',
};

describe('guestFingerprint', () => {
  it('changes when the repository setup script changes and otherwise stays stable', () => {
    // act
    const actual = guestFingerprint(image, 'corepack enable');

    // assert
    expect(actual).not.toBe(guestFingerprint(image));
    expect(guestFingerprint(image, 'corepack enable')).toBe(
      guestFingerprint(image, 'corepack enable'),
    );
  });
});
