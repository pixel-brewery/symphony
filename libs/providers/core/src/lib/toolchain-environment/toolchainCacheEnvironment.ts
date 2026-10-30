// #region Imports

import { join } from 'node:path';

// #endregion

/**
 * Cache locations for every toolchain Symphony may start. All of them point into one
 * application-owned root so downloads are reused across repositories, worktrees, and runs, and so
 * nothing is written to the places these tools use by default in the user's home directory.
 */
export function toolchainCacheEnvironment(cacheRoot: string): NodeJS.ProcessEnv {
  const cache = join(cacheRoot, 'cache');
  return {
    XDG_CACHE_HOME: cache,
    COREPACK_HOME: join(cache, 'corepack'),
    // A global Yarn cache plus hardlinked node_modules turns the install of an already known
    // dependency set into linking instead of copying.
    YARN_GLOBAL_FOLDER: join(cache, 'yarn'),
    YARN_ENABLE_GLOBAL_CACHE: 'true',
    YARN_NM_MODE: 'hardlinks-global',
    npm_config_cache: join(cache, 'npm'),
    npm_config_store_dir: join(cache, 'pnpm-store'),
    PNPM_HOME: join(cache, 'pnpm'),
    NX_CACHE_DIRECTORY: join(cache, 'nx'),
    PIP_CACHE_DIR: join(cache, 'pip'),
    UV_CACHE_DIR: join(cache, 'uv'),
    POETRY_CACHE_DIR: join(cache, 'poetry'),
    CARGO_HOME: join(cache, 'cargo'),
    GOCACHE: join(cache, 'go-build'),
    GOMODCACHE: join(cache, 'go-mod'),
    GRADLE_USER_HOME: join(cache, 'gradle'),
    MAVEN_ARGS: `-Dmaven.repo.local=${join(cache, 'maven')}`,
    NUGET_PACKAGES: join(cache, 'nuget'),
    PLAYWRIGHT_BROWSERS_PATH: join(cache, 'playwright'),
    PUPPETEER_CACHE_DIR: join(cache, 'puppeteer'),
    CYPRESS_CACHE_FOLDER: join(cache, 'cypress'),
  };
}
