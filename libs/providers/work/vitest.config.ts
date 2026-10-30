// #region Imports

import { defineConfig } from 'vitest/config';

// #endregion

export default defineConfig({
  test: {
    environment: 'node',
    include: ['libs/providers/work/src/**/*.spec.ts'],
  },
});
