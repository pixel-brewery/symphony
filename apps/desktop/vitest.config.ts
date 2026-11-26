// #region Imports

import { configDefaults, defineConfig } from 'vitest/config';

// #endregion

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, 'tools/nx-plugins/**'],
    include: ['apps/desktop/src/**/*.spec.ts', 'tools/**/*.spec.ts', 'forge.config.spec.ts'],
  },
});
