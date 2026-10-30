// #region Imports

import { isAbsolute, join } from 'node:path';
import { loginShellDirectories } from './LoginShellDirectories';
import { pathDirectories } from './pathDirectories';

// #endregion

const TOOLCHAIN_DIRECTORIES = ['/opt/homebrew/bin', '/usr/local/bin'] as const;

const HOME_TOOLCHAIN_DIRECTORIES = [
  '.volta/bin',
  '.local/bin',
  '.yarn/bin',
  '.bun/bin',
  '.npm-global/bin',
  'Library/pnpm',
] as const;

/**
 * Every directory Symphony searches for developer tooling, most specific first.
 *
 * @param environment - Process environment the search path is derived from.
 * @returns The de-duplicated toolchain search directories.
 * @public
 */
export function toolchainDirectories(
  environment: NodeJS.ProcessEnv = process.env,
): readonly string[] {
  const home = environment['HOME'];
  const npmPrefix = environment['npm_config_prefix'] ?? environment['NPM_CONFIG_PREFIX'];
  const installerDirectories = [
    ...(npmPrefix && isAbsolute(npmPrefix)
      ? [process.platform === 'win32' ? npmPrefix : join(npmPrefix, 'bin')]
      : []),
    ...(environment['HOMEBREW_PREFIX'] && isAbsolute(environment['HOMEBREW_PREFIX'])
      ? [join(environment['HOMEBREW_PREFIX'], 'bin')]
      : []),
  ].filter((directory): directory is string => Boolean(directory && isAbsolute(directory)));
  return [
    ...new Set([
      ...pathDirectories(environment['PATH']),
      ...loginShellDirectories.resolve(environment),
      ...TOOLCHAIN_DIRECTORIES,
      ...(home ? HOME_TOOLCHAIN_DIRECTORIES.map((directory) => join(home, directory)) : []),
      ...installerDirectories,
    ]),
  ];
}
