// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { enableArcade } from './enableArcade';
import { expectArcadePlayfield } from './expectArcadePlayfield';
import { launchArcadeApp } from './launchArcadeApp';
import { prepareMainWindow } from './prepareMainWindow';
import { selectArcadeTheme } from './selectArcadeTheme';

// #endregion

test('dives, fires, surfaces empty and hands the rescue to player two with native menus', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('seaquest-controls');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(page);
    for (const theme of ['light', 'dark'] as const) {
      // act
      await selectArcadeTheme(page, theme);
      await page.getByTestId('navigation-arcade').click();
      await page.getByTestId('arcade-play-seaquest').click();
      await expect(page.getByTestId('seaquest-view')).toHaveAttribute('data-screen', 'intro');
      await page.getByTestId('seaquest-instructions').click();
      await expect(page.getByTestId('seaquest-view')).toHaveAttribute(
        'data-screen',
        'instructions',
      );
      await page.getByTestId('seaquest-back-title').click();
      await page.getByTestId('seaquest-players').click();
      await page.getByTestId('seaquest-players-2').click();
      await page.screenshot({
        path: resolve(outputDirectory, `seaquest-intro-${theme}.png`),
        animations: 'disabled',
      });
      await page.getByTestId('seaquest-start').click();
      const screen = page.getByTestId('seaquest-screen');
      const status = page.getByTestId('seaquest-status');

      // assert
      await expect(status).toHaveAttribute('data-state', 'ready');
      await expect(status).toHaveAttribute('data-oxygen', '64');
      await expect(status).toHaveAttribute('data-player', '1');
      await expectArcadePlayfield(page, {
        root: 'seaquest-view',
        header: 'seaquest-header',
        playfield: 'seaquest-playfield',
        canvas: 'seaquest-screen',
      });

      // act
      await screen.focus();
      await page.keyboard.down('ArrowDown');
      await expect
        .poll(async () => Number(await screen.getAttribute('data-player-y')), { intervals: [20] })
        .toBeGreaterThan(40);
      await page.keyboard.up('ArrowDown');
      await page.keyboard.down('Space');
      await expect
        .poll(async () => Number(await status.getAttribute('data-oxygen')))
        .toBeLessThan(64);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyP');
      await expect(status).toHaveAttribute('data-state', 'paused');
      const pausedY = await screen.getAttribute('data-player-y');
      const pausedOxygen = await status.getAttribute('data-oxygen');
      await page.screenshot({
        path: resolve(outputDirectory, `seaquest-playing-${theme}.png`),
        animations: 'disabled',
      });
      await page.getByTestId('seaquest-menu').click();
      await expect(page.getByTestId('seaquest-view')).toHaveAttribute('data-screen', 'intro');
      await page.getByTestId('seaquest-resume').click();
      await expect(screen).toHaveAttribute('data-player-y', pausedY!);
      await expect(status).toHaveAttribute('data-oxygen', pausedOxygen!);
      await page.getByTestId('seaquest-sound').click();
      await expect(page.getByTestId('seaquest-sound')).toHaveAttribute('aria-pressed', 'false');
      await screen.focus();
      await page.keyboard.down('ArrowUp');
      await expect(status).toHaveAttribute('data-state', 'dying');
      await page.keyboard.up('ArrowUp');
      await expect(status).toHaveAttribute('data-player', '2');
      await expect(status).toHaveAttribute('data-state', 'ready');
      await expect(status).toHaveAttribute('data-oxygen', '64');
      await page.getByTestId('seaquest-reset').click();

      // assert
      await expect(status).toHaveAttribute('data-state', 'ready');
      await expect(status).toHaveAttribute('data-player', '1');
      await expect(status).toHaveAttribute('data-score', '0');
      await expect(status).toHaveAttribute('data-divers', '0');
      await expect(screen).toHaveAttribute('data-player-y', '13');
      await page.getByTestId('seaquest-back-arcade').click();
      await expect(screen).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
