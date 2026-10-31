// #region Imports

import { defineConfig } from 'vitest/config';

// #endregion

export default defineConfig({
  test: {
    environment: 'node',
    include: ['libs/persistence/features/execution/src/**/*.spec.ts'],
  },
});
