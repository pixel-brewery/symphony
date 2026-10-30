// #region Imports

import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { ValidateReleasePackageMetadata } from './ValidateReleasePackageMetadata.mjs';

// #endregion

const run = promisify(execFile);
const validForgeConfiguration = {
  packagerConfig: { executableName: 'Symphony' },
  makers: [{ name: 'deb', config: { options: { bin: 'Symphony' } } }],
};

describe('release package metadata', () => {
  it('provides the metadata required by the Linux and Windows installers', async () => {
    // arrange
    const policyScript = resolve('tools/ValidateReleasePackageMetadata.mjs');

    // act
    const result = await run(process.execPath, [policyScript]);

    // assert
    expect(result.stdout).toContain('supports Linux and Windows installers');
  });

  it('rejects missing installer metadata', async () => {
    // arrange
    const packageSource = JSON.stringify({ name: 'symphony' });

    // act
    const violations = await ValidateReleasePackageMetadata(packageSource, validForgeConfiguration);

    // assert
    expect(violations).toEqual([
      'The package manifest must provide an installer description.',
      'The package manifest must provide an installer author.',
    ]);
  });

  it('rejects a Debian binary that differs from the packaged executable', async () => {
    // arrange
    const packageSource = JSON.stringify({
      author: 'RueDeRennes',
      description: 'Symphony',
    });
    const forgeConfiguration = {
      packagerConfig: { executableName: 'Symphony' },
      makers: [{ name: 'deb', config: { options: { bin: 'symphony' } } }],
    };

    // act
    const violations = await ValidateReleasePackageMetadata(packageSource, forgeConfiguration);

    // assert
    expect(violations).toEqual([
      'The Debian installer binary must match the packaged executable name.',
    ]);
  });
});
