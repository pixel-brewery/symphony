// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';

// #endregion

test('Overview shows a relevant external-service incident between the greeting and the cards', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `external-service-incident-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });

  // act
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: workspace,
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_EXTERNAL_SERVICE_STATUS_MODE: 'simulated-outage',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    // Symphony opens on Overview.
    await expect(page.getByTestId('home-view')).toBeVisible();
    const banner = page.getByTestId('home-external-service-incident');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('GitHub is reporting service problems');
    await expect(banner).toContainText('Actions is affected.');
    await expect(banner).toContainText(
      'Local workflow runs may be delayed because GitHub still coordinates self-hosted jobs.',
    );

    const geometry = await page.evaluate(() => {
      const bounds = (testId: string) =>
        document.querySelector(`[test-id="${testId}"]`)?.getBoundingClientRect();
      return {
        greetingBottom: bounds('home-greeting')?.bottom ?? 0,
        bannerTop: bounds('home-external-service-incident')?.top ?? 0,
        bannerBottom: bounds('home-external-service-incident')?.bottom ?? 0,
        cardsTop: bounds('home-waiting-card')?.top ?? 0,
      };
    });
    expect(geometry.bannerTop).toBeGreaterThan(geometry.greetingBottom);
    expect(geometry.bannerBottom).toBeLessThan(geometry.cardsTop);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
