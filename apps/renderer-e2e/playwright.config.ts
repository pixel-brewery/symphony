// #region Imports

import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';
import { installAgentRuntimeFixtures } from './src/installAgentRuntimeFixtures';

// #endregion

const hostPath = process.env['SYMPHONY_E2E_HOST_PATH'] ?? process.env['PATH'] ?? '';
const windowMode =
  process.env['SYMPHONY_E2E_WINDOW_MODE'] ?? (process.env['CI'] ? 'visible' : 'hidden');
if (windowMode !== 'hidden' && windowMode !== 'visible') {
  throw new Error('SYMPHONY_E2E_WINDOW_MODE must be hidden or visible.');
}
const executableDirectory = installAgentRuntimeFixtures(
  resolve('output/playwright/runtime-fixtures'),
);
process.env['SYMPHONY_E2E_HOST_PATH'] = hostPath;
process.env['SYMPHONY_E2E_WINDOW_MODE'] = windowMode;
process.env['PATH'] = `${executableDirectory}:${hostPath}`;

export default defineConfig({
  testDir: './src',
  testIgnore: [
    // Temporarily suspend game journeys while the Memphis design is adjusted.
    '**/arcade-*.spec.ts',
    // The release job supplies the exact Forge executable and its compiled origin.
    ...(process.env['SYMPHONY_E2E_PACKAGED_UPDATE'] === '1' ? [] : ['**/packaged-update.spec.ts']),
  ],
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'output/playwright/test-results',
  use: {
    testIdAttribute: 'test-id',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
