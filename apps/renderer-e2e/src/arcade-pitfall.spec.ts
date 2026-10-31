// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { enableArcade } from './enableArcade';
import { expectArcadePlayfield } from './expectArcadePlayfield';
import { selectArcadeTheme } from './selectArcadeTheme';
import { launchArcadeApp } from './launchArcadeApp';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

async function openPitfall(page: Page): Promise<void> {
  await page.getByTestId('navigation-arcade').click();
  await expect(page).toHaveURL(/#\/main\/arcade$/);
  await expect(page.getByTestId('arcade-view')).toBeVisible();
  await expect(page.getByTestId('arcade-game-pitfall')).toBeVisible();
  await expect(page.getByTestId('arcade-screen')).toHaveCount(0);
  await page.getByTestId('arcade-play-pitfall').click();
  await expect(page).toHaveURL(/#\/main\/arcade\/pitfall$/);
  await expect(page.getByTestId('pitfall-view')).toHaveAttribute('data-screen', 'intro');
}

async function startExpedition(page: Page): Promise<void> {
  await page.getByTestId('pitfall-start').click();
  await expect(page.getByTestId('pitfall-view')).toHaveAttribute('data-screen', 'game');
  await expect(page.getByTestId('arcade-screen')).toBeVisible();
  await expect(page.getByTestId('arcade-status')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByTestId('arcade-status')).toHaveAttribute('data-score', '2000');
  await expect(page.getByTestId('arcade-status')).toHaveAttribute('data-lives', '3');
  await expect(page.getByTestId('arcade-status')).toHaveAttribute('data-treasures', '0');
  await expect(page.getByTestId('arcade-status')).toHaveAttribute('data-time', '1200');
}

async function resizeMainWindow(app: ElectronApplication, page: Page): Promise<void> {
  const viewport = await app.evaluate(({ BrowserWindow }, rendererUrl) => {
    const window = BrowserWindow.getAllWindows().find(
      (candidate) => candidate.webContents.getURL() === rendererUrl,
    );
    if (!window) throw new Error('The Symphony main window is unavailable.');
    window.setContentSize(1440, 900);
    const [width, height] = window.getContentSize();
    return { width, height };
  }, page.url());
  await page.waitForFunction(
    ({ width, height }) => window.innerWidth === width && window.innerHeight === height,
    viewport,
  );
}

async function expectThemeBackground(page: Page): Promise<readonly number[]> {
  const screen = page.getByTestId('arcade-screen');
  await expect
    .poll(() =>
      screen.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext('2d');
        const probe = document.createElement('canvas');
        probe.width = 1;
        probe.height = 1;
        const probeContext = probe.getContext('2d');
        if (!context || !probeContext) return false;
        probeContext.fillStyle = getComputedStyle(canvas)
          .getPropertyValue('--mosaik-scheme-background')
          .trim();
        probeContext.fillRect(0, 0, 1, 1);
        const actual = context.getImageData(0, 0, 1, 1).data;
        const expected = probeContext.getImageData(0, 0, 1, 1).data;
        return actual[3] === 255 && actual.every((channel, index) => channel === expected[index]);
      }),
    )
    .toBe(true);
  return screen.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d');
    if (!context) throw new Error('The Pitfall canvas is unavailable.');
    return [...context.getImageData(0, 0, 1, 1).data];
  });
}

test('selects Pitfall, navigates its menu and plays across the full area in both themes', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('pitfall-controls');
  const rendererErrors: string[] = [];

  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await enableArcade(page);

    // act
    await selectArcadeTheme(page, 'light');
    await page.getByTestId('navigation-arcade').click();

    // assert
    await expect(page.getByTestId('arcade-view')).toBeVisible();
    await expect(page.getByTestId('arcade-game-pitfall')).toBeVisible();
    await expect(page.getByTestId('arcade-screen')).toHaveCount(0);
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-games-light.png'),
      animations: 'disabled',
    });

    // act
    await openPitfall(page);
    await page.getByTestId('pitfall-instructions').click();

    // assert
    await expect(page.getByTestId('pitfall-view')).toHaveAttribute('data-screen', 'instructions');
    await page.getByTestId('pitfall-back-title').click();
    await expect(page.getByTestId('pitfall-view')).toHaveAttribute('data-screen', 'intro');
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-pitfall-intro-light.png'),
      animations: 'disabled',
    });

    // act
    await startExpedition(page);
    const screen = page.getByTestId('arcade-screen');
    const status = page.getByTestId('arcade-status');
    const startingX = Number(await screen.getAttribute('data-player-x'));
    const groundY = Number(await screen.getAttribute('data-player-y'));
    await screen.focus();
    await page.keyboard.press('Space');

    // assert
    await expect(status).toHaveAttribute('data-status', 'ready');
    await expect(status).toHaveAttribute('data-time', '1200');
    await expectArcadePlayfield(page, {
      root: 'pitfall-view',
      header: 'arcade-header',
      playfield: 'arcade-playfield',
      canvas: 'arcade-screen',
    });
    const compactBounds = await screen.boundingBox();
    const lightBackground = await expectThemeBackground(page);
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-pitfall-light-compact.png'),
      animations: 'disabled',
    });

    // act
    await screen.focus();
    await page.keyboard.down('ArrowRight');

    // assert
    await expect(status).toHaveAttribute('data-status', 'playing');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-player-x')), { intervals: [25] })
      .toBeGreaterThan(startingX + 8);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('Space');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-player-y')), { intervals: [25] })
      .toBeLessThan(groundY - 3);
    await page.keyboard.up('Space');
    const rightX = Number(await screen.getAttribute('data-player-x'));
    await page.keyboard.down('ArrowLeft');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-player-x')), { intervals: [25] })
      .toBeLessThan(rightX - 5);
    await page.keyboard.up('ArrowLeft');

    // act
    await page.keyboard.press('KeyP');

    // assert
    await expect(status).toHaveAttribute('data-status', 'paused');
    const pausedX = await screen.getAttribute('data-player-x');
    const pausedY = await screen.getAttribute('data-player-y');
    const pausedTime = await status.getAttribute('data-time');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(screen).toHaveAttribute('data-player-x', pausedX ?? '');
    await expect(screen).toHaveAttribute('data-player-y', pausedY ?? '');
    await expect(status).toHaveAttribute('data-time', pausedTime ?? '');
    await page.getByTestId('arcade-pause').click();
    await expect(status).toHaveAttribute('data-status', 'playing');

    // act
    const beforeBlurX = Number(await screen.getAttribute('data-player-x'));
    await page.keyboard.down('ArrowRight');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-player-x')), { intervals: [25] })
      .toBeGreaterThan(beforeBlurX + 4);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));

    // assert
    await expect(status).toHaveAttribute('data-status', 'paused');
    const blurredX = await screen.getAttribute('data-player-x');
    await screen.focus();
    await page.keyboard.press('KeyP');
    await expect(status).toHaveAttribute('data-status', 'playing');
    const timeAtResume = Number(await status.getAttribute('data-time'));
    await expect
      .poll(async () => Number(await status.getAttribute('data-time')))
      .toBeLessThan(timeAtResume);
    await expect(screen).toHaveAttribute('data-player-x', blurredX ?? '');
    await page.keyboard.up('ArrowRight');

    // act
    const sound = page.getByTestId('pitfall-sound');
    await expect(sound).toHaveAttribute('aria-pressed', /^(true|false)$/);
    const soundBefore = await sound.getAttribute('aria-pressed');
    await sound.click();

    // assert
    await expect(sound).toHaveAttribute('aria-pressed', soundBefore === 'true' ? 'false' : 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', soundBefore ?? 'true');

    // act
    await screen.focus();
    await page.keyboard.press('KeyP');
    await expect(status).toHaveAttribute('data-status', 'paused');
    const menuScore = await status.getAttribute('data-score');
    const menuTime = Number(await status.getAttribute('data-time'));
    const menuX = await screen.getAttribute('data-player-x');
    await page.getByTestId('pitfall-menu').click();

    // assert
    await expect(page.getByTestId('pitfall-view')).toHaveAttribute('data-screen', 'intro');
    await page.getByTestId('pitfall-instructions').click();
    await page.getByTestId('pitfall-back-title').click();
    await page.getByTestId('pitfall-resume').click();
    await expect(page.getByTestId('pitfall-view')).toHaveAttribute('data-screen', 'game');
    await expect(status).toHaveAttribute('data-status', 'playing');
    await expect(status).toHaveAttribute('data-score', menuScore ?? '');
    await expect(screen).toHaveAttribute('data-player-x', menuX ?? '');
    expect(Number(await status.getAttribute('data-time'))).toBeGreaterThanOrEqual(menuTime - 1);
    expect(Number(await status.getAttribute('data-time'))).toBeLessThanOrEqual(menuTime);

    // act
    await page.getByTestId('arcade-new-game').click();

    // assert
    await expect(status).toHaveAttribute('data-status', 'ready');
    await expect(status).toHaveAttribute('data-score', '2000');
    await expect(status).toHaveAttribute('data-lives', '3');
    await expect(status).toHaveAttribute('data-time', '1200');
    await expect(screen).toHaveAttribute('data-player-x', String(startingX));
    await expect(screen).toHaveAttribute('data-player-y', String(groundY));

    // act
    await resizeMainWindow(app, page);

    // assert
    await expectArcadePlayfield(page, {
      root: 'pitfall-view',
      header: 'arcade-header',
      playfield: 'arcade-playfield',
      canvas: 'arcade-screen',
    });
    expect(await screen.boundingBox()).not.toEqual(compactBounds);
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-pitfall-light-wide.png'),
      animations: 'disabled',
    });

    // act
    await screen.focus();
    await page.keyboard.press('Control+ArrowRight');
    await page.getByTestId('global-search-launcher').click();
    const search = page.getByTestId('global-search-launcher-input');
    await expect(search).toBeVisible();
    await page.keyboard.type('p a s');
    await page.keyboard.press('ArrowRight');

    // assert
    await expect(search).toHaveJSProperty('value', 'p a s');
    await expect(status).toHaveAttribute('data-status', 'ready');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('global-search-launcher')).toBeVisible();

    // act
    await page.getByTestId('pitfall-back-arcade').click();

    // assert
    await expect(page.getByTestId('arcade-view')).toBeVisible();
    await expect(screen).toHaveCount(0);
    await page.getByTestId('arcade-play-pitfall').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('pitfall-view')).toHaveAttribute('data-screen', 'intro');
    await expect(page.getByTestId('pitfall-resume')).toHaveCount(0);

    // act
    await selectArcadeTheme(page, 'dark');
    await page.getByTestId('navigation-arcade').click();
    await expect(page.getByTestId('arcade-view')).toBeVisible();
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-games-dark.png'),
      animations: 'disabled',
    });
    await openPitfall(page);
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-pitfall-intro-dark.png'),
      animations: 'disabled',
    });
    await startExpedition(page);

    // assert
    await expectArcadePlayfield(page, {
      root: 'pitfall-view',
      header: 'arcade-header',
      playfield: 'arcade-playfield',
      canvas: 'arcade-screen',
    });
    expect(await expectThemeBackground(page)).not.toEqual(lightBackground);
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-pitfall-dark-wide.png'),
      animations: 'disabled',
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

test('finishes a real expedition and keeps it in the Arcade leaderboard after restarting Symphony', async () => {
  // arrange
  const runtime = await launchArcadeApp('pitfall-records');
  const { configurationRoot, outputDirectory } = runtime;
  let app = runtime.app;
  const rendererErrors: string[] = [];

  try {
    let page = await prepareMainWindow(app);
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await enableArcade(page);
    await selectArcadeTheme(page, 'light');
    await openPitfall(page);
    await startExpedition(page);
    const screen = page.getByTestId('arcade-screen');
    const status = page.getByTestId('arcade-status');
    const groundY = await screen.getAttribute('data-player-y');
    const initialRoom = await status.getAttribute('data-room');

    // act
    // The room to the left of the reset scene contains a crocodile pool. Walk into it.
    await screen.focus();
    await page.keyboard.down('ArrowLeft');

    // assert
    await expect(status).not.toHaveAttribute('data-room', initialRoom ?? '');
    await expect(status).toHaveAttribute('data-lives', '2');
    await page.keyboard.up('ArrowLeft');
    await expect(screen).toHaveAttribute('data-pose', 'idle');
    await expect(screen).toHaveAttribute('data-player-y', groundY ?? '');

    // act
    // Each actual death returns Harry to the left bank of the same room.
    await page.keyboard.down('ArrowRight');

    // assert
    await expect(status).toHaveAttribute('data-lives', '1');
    await page.keyboard.up('ArrowRight');
    await expect(screen).toHaveAttribute('data-pose', 'idle');
    await expect(screen).toHaveAttribute('data-player-y', groundY ?? '');

    // act
    await page.keyboard.down('ArrowRight');

    // assert
    await expect(status).toHaveAttribute('data-lives', '0');
    await page.keyboard.up('ArrowRight');
    await expect(status).toHaveAttribute('data-status', 'gameOver');
    await expect(page.getByTestId('pitfall-result')).toBeVisible();
    const finalScore = await status.getAttribute('data-score');
    const finalTreasures = await status.getAttribute('data-treasures');
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-pitfall-result.png'),
      animations: 'disabled',
    });

    // act
    await page.getByTestId('pitfall-result-all-games').click();
    await page.getByTestId('arcade-open-leaderboard').click();

    // assert
    await expect(page.getByTestId('arcade-leaderboard-dialog')).toBeVisible();
    let record = page.getByTestId('leaderboard-pitfall-result');
    await expect(record).toHaveCount(1);
    await expect(record).toHaveAttribute('data-score', finalScore ?? '');
    await expect(record).toHaveAttribute('data-treasures', finalTreasures ?? '');
    await expect(record).toHaveAttribute('data-outcome', 'lost');

    // act
    await app.close();
    app = (await launchArcadeApp('pitfall-records', false)).app;
    page = await prepareMainWindow(app);
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await page.getByTestId('navigation-arcade').click();
    await page.getByTestId('arcade-open-leaderboard').click();

    // assert
    await expect(page.getByTestId('arcade-leaderboard-dialog')).toBeVisible();
    record = page.getByTestId('leaderboard-pitfall-result');
    await expect(record).toHaveCount(1);
    await expect(record).toHaveAttribute('data-score', finalScore ?? '');
    await expect(record).toHaveAttribute('data-treasures', finalTreasures ?? '');
    await expect(record).toHaveAttribute('data-outcome', 'lost');
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-leaderboard-light.png'),
      animations: 'disabled',
    });
    await page.getByTestId('arcade-leaderboard-close').click();
    await selectArcadeTheme(page, 'dark');
    await page.getByTestId('navigation-arcade').click();
    await page.getByTestId('arcade-open-leaderboard').click();
    await expect(page.getByTestId('leaderboard-pitfall-result')).toHaveCount(1);
    await page.screenshot({
      path: resolve(outputDirectory, 'arcade-leaderboard-dark.png'),
      animations: 'disabled',
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
