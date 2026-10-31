// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { enableArcade } from './enableArcade';
import { expectArcadePlayfield } from './expectArcadePlayfield';
import { launchArcadeApp } from './launchArcadeApp';
import { prepareMainWindow } from './prepareMainWindow';
import { selectArcadeTheme } from './selectArcadeTheme';

// #endregion

async function resize(
  app: ElectronApplication,
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  await app.evaluate(
    ({ BrowserWindow }, dimensions) => {
      const window = BrowserWindow.getAllWindows().find(
        (candidate) => candidate.webContents.getURL() === dimensions.url,
      );
      if (!window) throw new Error('The Symphony main window is unavailable.');
      window.setContentSize(dimensions.width, dimensions.height);
    },
    { url: page.url(), width, height },
  );
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
}

async function openGame(page: Page): Promise<void> {
  await page.getByTestId('navigation-arcade').click();
  await page.getByTestId('arcade-play-pitfall-ii').click();
  await expect(page).toHaveURL(/#\/main\/arcade\/pitfall-ii$/);
  await expect(page.getByTestId('pitfall-ii-view')).toHaveAttribute('data-screen', 'intro');
}

test('plays the Pitfall II expedition with native menus, input, pause and a full themed playfield', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('pitfall-ii-controls');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(app, page);
    for (const theme of ['light', 'dark'] as const) {
      // act
      await resize(app, page, 1440, 900);
      await selectArcadeTheme(app, page, theme);
      await openGame(page);
      await page.getByTestId('pitfall-ii-instructions').click();
      await expect(page.getByTestId('pitfall-ii-view')).toHaveAttribute(
        'data-screen',
        'instructions',
      );
      await page.getByTestId('pitfall-ii-back-title').click();
      await page.screenshot({
        path: resolve(outputDirectory, `pitfall-ii-intro-${theme}.png`),
        animations: 'disabled',
      });
      await page.getByTestId('pitfall-ii-start').click();
      const screen = page.getByTestId('pitfall-ii-screen');
      const status = page.getByTestId('pitfall-ii-status');

      // assert
      await expect(status).toHaveAttribute('data-status', 'ready');
      await expect(status).toHaveAttribute('data-score', '4000');
      await expect(status).toHaveAttribute('data-gold', '0');
      await expectArcadePlayfield(page, {
        root: 'pitfall-ii-view',
        header: 'pitfall-ii-header',
        playfield: 'pitfall-ii-playfield',
        canvas: 'pitfall-ii-screen',
      });
      await page.screenshot({
        path: resolve(outputDirectory, `pitfall-ii-playing-${theme}.png`),
        animations: 'disabled',
      });
      const startX = Number(await screen.getAttribute('data-player-x'));
      const startY = Number(await screen.getAttribute('data-player-y'));
      await screen.focus();
      await page.keyboard.press('Space');
      await expect(status).toHaveAttribute('data-status', 'ready');
      await page.keyboard.down('ArrowRight');
      await expect
        .poll(async () => Number(await screen.getAttribute('data-player-x')))
        .toBeGreaterThan(startX + 10);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.down('Space');
      await expect
        .poll(async () => Number(await screen.getAttribute('data-player-y')), { intervals: [20] })
        .toBeLessThan(startY - 3);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyP');
      await expect(status).toHaveAttribute('data-status', 'paused');
      const pausedX = await screen.getAttribute('data-player-x');
      const pausedY = await screen.getAttribute('data-player-y');
      await page.keyboard.press('ArrowRight');
      await expect(screen).toHaveAttribute('data-player-x', pausedX!);
      await expect(screen).toHaveAttribute('data-player-y', pausedY!);

      // act
      await page.getByTestId('pitfall-ii-menu').click();
      await expect(page.getByTestId('pitfall-ii-view')).toHaveAttribute('data-screen', 'intro');
      await page.getByTestId('pitfall-ii-resume').click();
      await expect(status).toHaveAttribute('data-status', 'playing');
      await expect
        .poll(async () => Number(await screen.getAttribute('data-player-y')))
        .toBe(startY);
      await page.getByTestId('pitfall-ii-sound').click();
      await expect(page.getByTestId('pitfall-ii-sound')).toHaveAttribute('aria-pressed', 'false');
      await screen.focus();
      await page.keyboard.press('KeyP');
      await expect(status).toHaveAttribute('data-status', 'paused');
      await resize(app, page, 940, 700);
      await expectArcadePlayfield(page, {
        root: 'pitfall-ii-view',
        header: 'pitfall-ii-header',
        playfield: 'pitfall-ii-playfield',
        canvas: 'pitfall-ii-screen',
      });
      await page.screenshot({
        path: resolve(outputDirectory, `pitfall-ii-compact-${theme}.png`),
        animations: 'disabled',
      });
      await page.getByTestId('pitfall-ii-reset').click();

      // assert
      await expect(status).toHaveAttribute('data-status', 'ready');
      await expect(status).toHaveAttribute('data-score', '4000');
      await expect(screen).toHaveAttribute('data-player-x', String(startX));
      await page.getByTestId('pitfall-ii-back-arcade').click();
      await expect(page.getByTestId('arcade-view')).toBeVisible();
      await expect(screen).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
