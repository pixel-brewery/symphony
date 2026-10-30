// #region Imports

import { defineConfig } from 'vitest/config';

// #endregion

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/desktop/src/**/*.spec.ts', 'tools/**/*.spec.ts'],
  },
});
