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

test('plays Jungle Hunt with original skill selection, live vines, preserved menus and one finalized score', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('jungle-hunt-controls');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(page);
    for (const theme of ['light', 'dark'] as const) {
      await selectArcadeTheme(page, theme);
      await page.getByTestId('navigation-arcade').click();
      await page.getByTestId('arcade-play-jungle-hunt').click();
      await expect(page.getByTestId('jungle-hunt-view')).toHaveAttribute('data-screen', 'intro');
      // act
      await page.getByTestId('jungle-hunt-instructions').click();
      await expect(page.getByTestId('jungle-hunt-view')).toHaveAttribute(
        'data-screen',
        'instructions',
      );
      await page.getByTestId('jungle-hunt-back-title').click();
      await page.getByTestId('jungle-hunt-skill').click();
      await page.getByTestId('jungle-hunt-start').click();
      const screen = page.getByTestId('jungle-hunt-screen');
      const status = page.getByTestId('jungle-hunt-status');
      // assert
      await expect(status).toHaveAttribute('data-status', 'playing');
      await expect(status).toHaveAttribute('data-stage', 'vines');
      await expect(status).toHaveAttribute('data-skill', '2');
      await expect(status).toHaveAttribute('data-lives', '5');
      await expectArcadePlayfield(page, {
        root: 'jungle-hunt-view',
        header: 'jungle-hunt-header',
        playfield: 'jungle-hunt-playfield',
        canvas: 'jungle-hunt-screen',
      });
      const initialX = Number(await screen.getAttribute('data-player-x'));
      await expect
        .poll(async () => Number(await screen.getAttribute('data-player-x')))
        .not.toBe(initialX);
      await page.screenshot({
        path: resolve(outputDirectory, `jungle-hunt-playing-${theme}.png`),
        animations: 'disabled',
      });
      // act
      await screen.focus();
      await page.keyboard.press('Space');
      await expect(screen).toHaveAttribute('data-pose', 'jump');
      await page.keyboard.press('KeyP');
      await expect(status).toHaveAttribute('data-status', 'paused');
      const pausedX = await screen.getAttribute('data-player-x');
      const timer = await status.getAttribute('data-timer');
      await page.getByTestId('jungle-hunt-menu').click();
      await page.getByTestId('jungle-hunt-instructions').click();
      // assert
      await expect(screen).toHaveAttribute('data-player-x', pausedX!);
      await expect(status).toHaveAttribute('data-timer', timer!);
      // act
      await page.getByTestId('jungle-hunt-back-title').click();
      await page.getByTestId('jungle-hunt-resume').click();
      await page.getByTestId('jungle-hunt-sound').click();
      await expect(page.getByTestId('jungle-hunt-sound')).toHaveAttribute('aria-pressed', 'false');
      await page.getByTestId('jungle-hunt-reset').click();
      await expect(status).toHaveAttribute('data-score', '0');
      await expect(status).toHaveAttribute('data-lives', '5');
      await page.getByTestId('jungle-hunt-menu').click();
      await page.getByTestId('jungle-hunt-end-menu').click();
      await expect(status).toHaveAttribute('data-status', 'gameOver');
      await expect(page.getByTestId('jungle-hunt-play-again')).toBeVisible();
      await page.getByTestId('jungle-hunt-back-arcade').click();
      await expect(screen).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
