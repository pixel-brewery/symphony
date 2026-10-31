// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { enableArcade } from './enableArcade';
import { closeSettings } from './closeSettings';
import { launchArcadeApp } from './launchArcadeApp';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

async function arcadeEnabled(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const api = (window as Window & { orchestration?: IOrchestrationApi }).orchestration;
    if (!api) throw new Error('The typed desktop API is unavailable.');
    return (await api.request('settings.get', {})).user.arcadeEnabled;
  });
}

test('persists a feature contributed through Settings and Navigation across desktop restart', async () => {
  // arrange
  const first = await launchArcadeApp('modular-settings');
  let passed = false;
  try {
    try {
      const page = await prepareMainWindow(first.app);
      await expect(page.getByTestId('navigation-arcade')).toHaveCount(0);

      // act
      await enableArcade(page);
      const settings = await openSettings(page);
      await settings.getByTestId('global-settings-section-appearance').click();

      // assert
      await expect(settings.getByTestId('arcade-settings-card')).toBeVisible();
      await expect.poll(() => arcadeEnabled(page)).toBe(true);
      await settings.screenshot({
        animations: 'disabled',
        path: resolve(first.outputDirectory, 'modular-settings-appearance.png'),
      });
    } finally {
      await first.app.close();
    }

    // act
    const restarted = await launchArcadeApp('modular-settings', false);
    try {
      const page = await prepareMainWindow(restarted.app);

      // assert
      await expect(page.getByTestId('navigation-arcade')).toBeVisible();
      await expect.poll(() => arcadeEnabled(page)).toBe(true);
      await page.getByTestId('navigation-arcade').click();
      await expect(page.getByTestId('arcade-view')).toBeVisible();
      await page.screenshot({
        animations: 'disabled',
        path: resolve(restarted.outputDirectory, 'modular-feature-navigation.png'),
      });

      // act
      const settings = await openSettings(page);
      await settings.getByTestId('global-settings-section-appearance').click();
      await settings.getByTestId('arcade-enabled-toggle').click();

      // assert
      await expect(settings.getByTestId('arcade-enabled-toggle')).toHaveJSProperty(
        'isChecked',
        false,
      );
      await expect.poll(() => arcadeEnabled(page)).toBe(false);
      await closeSettings(page);
      await expect(page.getByTestId('navigation-home')).toBeVisible();
      await expect(page.getByTestId('navigation-arcade')).toHaveCount(0);
      passed = true;
    } finally {
      await restarted.app.close();
    }
  } finally {
    if (passed) rmSync(first.configurationRoot, { recursive: true, force: true });
  }
});
