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
  await page.getByTestId('arcade-play-pong').click();
  await expect(page).toHaveURL(/#\/main\/arcade\/pong$/);
  await expect(page.getByTestId('pong-view')).toHaveAttribute('data-screen', 'intro');
}

test('plays original two-player Pong with native menus, independent controls and a full themed court', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('pong-controls');
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
      await page.getByTestId('pong-instructions').click();
      await expect(page.getByTestId('pong-view')).toHaveAttribute('data-screen', 'instructions');
      await page.getByTestId('pong-back-title').click();
      await page.screenshot({
        path: resolve(outputDirectory, `pong-intro-${theme}.png`),
        animations: 'disabled',
      });
      await page.getByTestId('pong-start').click();
      const screen = page.getByTestId('pong-screen');
      const status = page.getByTestId('pong-status');
      // assert
      await expect(status).toHaveAttribute('data-target-score', '11');
      await expectArcadePlayfield(page, {
        root: 'pong-view',
        header: 'pong-header',
        playfield: 'pong-playfield',
        canvas: 'pong-screen',
      });
      const left = Number(await screen.getAttribute('data-left-paddle'));
      const right = Number(await screen.getAttribute('data-right-paddle'));
      await screen.focus();
      await page.keyboard.down('KeyW');
      await page.keyboard.down('ArrowDown');
      await expect
        .poll(async () => Number(await screen.getAttribute('data-left-paddle')))
        .toBeLessThan(left - 10);
      await expect
        .poll(async () => Number(await screen.getAttribute('data-right-paddle')))
        .toBeGreaterThan(right + 10);
      await page.keyboard.up('KeyW');
      await page.keyboard.up('ArrowDown');
      await page.keyboard.press('KeyP');
      await expect(status).toHaveAttribute('data-status', 'paused');
      const pausedX = await screen.getAttribute('data-ball-x');
      const pausedLeft = await screen.getAttribute('data-left-paddle');
      await page.keyboard.press('KeyS');
      await expect(screen).toHaveAttribute('data-left-paddle', pausedLeft!);
      await expect(screen).toHaveAttribute('data-ball-x', pausedX!);
      await page.getByTestId('pong-menu').click();
      await page.getByTestId('pong-resume').click();
      await expect(status).not.toHaveAttribute('data-status', 'paused');
      await page.getByTestId('pong-pause').click();
      await expect(status).toHaveAttribute('data-status', 'paused');
      expect(pausedX).not.toBeNull();
      await page.getByTestId('pong-sound').click();
      await expect(page.getByTestId('pong-sound')).toHaveAttribute('aria-pressed', 'false');
      await page.screenshot({
        path: resolve(outputDirectory, `pong-playing-${theme}.png`),
        animations: 'disabled',
      });
      await resize(app, page, 1040, 700);
      await expectArcadePlayfield(page, {
        root: 'pong-view',
        header: 'pong-header',
        playfield: 'pong-playfield',
        canvas: 'pong-screen',
      });
      await page.screenshot({
        path: resolve(outputDirectory, `pong-compact-${theme}.png`),
        animations: 'disabled',
      });
      await page.getByTestId('pong-reset').click();
      await expect(status).toHaveAttribute('data-left-score', '0');
      await expect(status).toHaveAttribute('data-right-score', '0');
      await page.getByTestId('pong-back-arcade').click();
      await expect(page.getByTestId('arcade-view')).toBeVisible();
      await expect(screen).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});

test('finishes a Pong match through real pointer controls and saves its result exactly once', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('pong-completion');
  try {
    const page = await prepareMainWindow(app);
    // Install before entering the lazy game route so every game frame uses this clock.
    await page.clock.install({ time: new Date('2026-09-18T12:00:00Z') });
    await enableArcade(app, page);
    await openGame(page);
    await page.getByTestId('pong-start').click();
    await page.clock.pauseAt(new Date('2026-09-18T12:00:30Z'));
    const screen = page.getByTestId('pong-screen');
    const status = page.getByTestId('pong-status');
    const bounds = await screen.boundingBox();
    if (!bounds) throw new Error('The Pong court is unavailable.');

    // act
    // Both human controls deliberately miss. All movement, serves and scoring still
    // run through real browser events and every scheduled animation frame.
    for (
      let step = 0;
      step < 450 && (await status.getAttribute('data-status')) !== 'gameOver';
      step++
    ) {
      const y = Number(await screen.getAttribute('data-ball-y')) < 123 ? 0.95 : 0.05;
      await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * y);
      await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * y);
      await page.clock.runFor(200);
    }
    await page.clock.resume();

    // assert
    await expect(page.getByTestId('pong-results')).toBeVisible();
    const scores = [
      Number(await status.getAttribute('data-left-score')),
      Number(await status.getAttribute('data-right-score')),
    ];
    expect(Math.max(...scores)).toBe(11);
    const winner = await status.getAttribute('data-winner');
    await page.screenshot({
      path: resolve(outputDirectory, 'pong-completed.png'),
      animations: 'disabled',
    });
    await page.getByTestId('pong-results-arcade').click();
    await page.getByTestId('arcade-open-leaderboard').click();
    const result = page.getByTestId('leaderboard-pong-result');
    await expect(result).toHaveCount(1);
    await expect(result).toHaveAttribute('data-winner', winner!);
    await expect(result).toContainText(`${scores[0]}–${scores[1]}`);
    await page.getByTestId('arcade-leaderboard-close').click();
    await page.getByTestId('arcade-open-leaderboard').click();
    await expect(result).toHaveCount(1);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
