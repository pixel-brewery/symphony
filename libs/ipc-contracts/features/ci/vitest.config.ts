// #region Imports

import { defineConfig } from 'vitest/config';

// #endregion

export default defineConfig({
  test: {
    environment: 'node',
    include: ['libs/ipc-contracts/features/ci/src/**/*.spec.ts'],
  },
});
