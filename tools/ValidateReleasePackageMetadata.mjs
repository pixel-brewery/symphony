// #region Imports

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import forgeConfiguration from '../forge.config.mjs';

// #endregion

/**
 * Validates the package metadata required by the Linux and Windows installers.
 *
 * @param {string} packageSource Root package manifest source.
 * @param {{ packagerConfig?: { executableName?: string }; makers?: Array<{ name?: string; prepareConfig?: (targetArch: string) => Promise<void>; config?: { options?: { bin?: string } } }> }} configuration Electron Forge configuration.
 * @returns {Promise<string[]>} Human-readable policy violations.
 * @public
 */
export async function ValidateReleasePackageMetadata(packageSource, configuration) {
  let packageManifest;

  try {
    packageManifest = JSON.parse(packageSource);
  } catch (error) {
    return [`The package manifest is not valid JSON: ${String(error)}`];
  }

  const violations = [];
  if (
    typeof packageManifest.description !== 'string' ||
    packageManifest.description.trim() === ''
  ) {
    violations.push('The package manifest must provide an installer description.');
  }

  const author = packageManifest.author;
  const authorName = typeof author === 'string' ? author : author?.name;
  if (typeof authorName !== 'string' || authorName.trim() === '') {
    violations.push('The package manifest must provide an installer author.');
  }

  const executableName = configuration.packagerConfig?.executableName;
  const debianMaker = configuration.makers?.find((maker) => maker.name === 'deb');
  await debianMaker?.prepareConfig?.('x64');
  if (
    typeof executableName !== 'string' ||
    executableName.trim() === '' ||
    debianMaker?.config?.options?.bin !== executableName
  ) {
    violations.push('The Debian installer binary must match the packaged executable name.');
  }

  return violations;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const packageSource = readFileSync(resolve('package.json'), 'utf8');
  const violations = await ValidateReleasePackageMetadata(packageSource, forgeConfiguration);

  if (violations.length > 0) {
    process.stderr.write(`${violations.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Release package metadata supports Linux and Windows installers.\n');
  }
}
