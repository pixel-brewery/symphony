// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { launchArcadeApp } from './launchArcadeApp';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('switches application language live across desktop windows and restores it after restart', async () => {
  // arrange
  const first = await launchArcadeApp('application-language');
  let passed = false;
  try {
    try {
      const page = await prepareMainWindow(first.app);
      const settings = await openSettings(page);
      await settings.getByTestId('global-settings-section-appearance').click();
      await expect(settings.locator('html')).toHaveAttribute('lang', 'en');
      await expect(settings.getByTestId('language-settings-card')).toContainText(
        'Application language',
      );

      // act
      await settings.getByTestId('language-de').click();

      // assert
      await expect(settings.locator('html')).toHaveAttribute('lang', 'de');
      await expect(settings.getByTestId('language-settings-card')).toContainText(
        'Anwendungssprache',
      );
      await expect(settings.getByTestId('language-de')).toHaveJSProperty('isChecked', true);
      await expect(settings.getByTestId('status-bar-sync-text')).not.toContainText('just now');
      await expect(settings.getByTestId('global-settings-section-appearance')).not.toHaveJSProperty(
        'label',
        'Appearance',
      );
      await expect(settings.getByTestId('notification-bell')).toHaveAttribute(
        'aria-label',
        /^Benachrichtigungen, (?:1 Problem erfordert|(?:[2-9]|[1-9]\d+) Probleme erfordern) Aufmerksamkeit$/u,
      );
      const tray = first.app.windows().find((window) => window.url().includes('#/menu-bar'));
      expect(tray).toBeDefined();
      if (!tray) throw new Error('The desktop menu-bar renderer is unavailable.');
      await expect(tray.locator('html')).toHaveAttribute('lang', 'de');
      await settings.screenshot({
        animations: 'disabled',
        path: resolve(first.outputDirectory, 'application-language-de.png'),
      });
    } finally {
      await first.app.close();
    }

    // act
    const restarted = await launchArcadeApp('application-language', false);
    try {
      const page = await prepareMainWindow(restarted.app);
      const settings = await openSettings(page);
      await settings.getByTestId('global-settings-section-appearance').click();

      // assert
      await expect(settings.locator('html')).toHaveAttribute('lang', 'de');
      await expect(settings.getByTestId('language-de')).toHaveJSProperty('isChecked', true);
      await expect(settings.getByTestId('language-settings-card')).toContainText(
        'Anwendungssprache',
      );

      // act
      await settings.getByTestId('language-en').click();

      // assert
      await expect(settings.locator('html')).toHaveAttribute('lang', 'en');
      await expect(settings.getByTestId('language-settings-card')).toContainText(
        'Application language',
      );
      await expect(settings.getByTestId('global-settings-section-appearance')).toHaveJSProperty(
        'label',
        'Appearance',
      );
      passed = true;
    } finally {
      await restarted.app.close();
    }
  } finally {
    if (passed) rmSync(first.configurationRoot, { recursive: true, force: true });
  }
});
