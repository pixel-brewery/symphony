// #region Imports

import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { toolchainSearchPath } from '@symphony/providers-core';

// #endregion

export function runtimeEnvironment(
  runtimeRoot: string,
  limaHome: string,
  binaryDirectory: string,
): NodeJS.ProcessEnv {
  const home = join(runtimeRoot, 'home');
  const cache = join(runtimeRoot, 'cache', 'lima-downloads');
  const temporary = join(runtimeRoot, 'tmp');
  for (const directory of [home, cache, temporary]) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  const environment: NodeJS.ProcessEnv = {
    HOME: home,
    LIMA_HOME: limaHome,
    PATH: [binaryDirectory, toolchainSearchPath()].filter(Boolean).join(':'),
    TMPDIR: temporary,
    XDG_CACHE_HOME: cache,
  };
  for (const name of ['LANG', 'LC_ALL', 'SHELL'] as const) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  return environment;
}
