// #region Imports

import { defineConfig } from 'vitest/config';

// #endregion

export default defineConfig({
  test: {
    environment: 'node',
    include: ['libs/persistence/features/ci/src/**/*.spec.ts'],
    // Hosted Windows runners can take longer to complete the synchronous SQLite disk work.
    testTimeout:
      process.platform === 'win32' && process.env['GITHUB_ACTIONS'] === 'true' ? 30_000 : 5_000,
  },
});
