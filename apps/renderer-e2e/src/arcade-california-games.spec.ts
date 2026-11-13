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

test('plays the four-event Lynx cartridge flow with pause, flip and local players', async () => {
  test.setTimeout(120_000);
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('california-games');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(page);
    await selectArcadeTheme(page, 'light');
    await page.getByTestId('navigation-arcade').click();
    await page.getByTestId('arcade-play-california-games').click();
    const view = page.getByTestId('california-games-view');
    const screen = page.getByTestId('california-games-screen');
    const status = page.getByTestId('california-games-status');

    // assert
    await expect(view).toHaveAttribute('data-screen', 'intro');
    await expect(status).toHaveAttribute('data-phase', /intro|title/);
    await expectArcadePlayfield(page, {
      root: 'california-games-view',
      header: 'california-games-header',
      playfield: 'california-games-playfield',
      canvas: 'california-games-screen',
    });

    // act
    await expect(status).toHaveAttribute('data-phase', 'title', { timeout: 5_000 });
    await page.getByTestId('california-games-sound').focus();
    await expect(page.getByTestId('california-games-sound')).toBeFocused();
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-phase', 'menu');
    await page.keyboard.press('ArrowDown');
    await expect(status).toHaveAttribute('data-event', 'surfing');
    await page.keyboard.press('ArrowUp');
    await expect(status).toHaveAttribute('data-event', 'bmx');
    await page.keyboard.press('KeyX');
    await expect(status).toHaveAttribute('data-phase', 'countdown');
    await expect(status).toHaveAttribute('data-event', 'bmx');
    await expect(status).toHaveAttribute('data-players', '1');
    await expect(status).toHaveAttribute('data-phase', 'playing', { timeout: 5_000 });
    await screen.click();
    await expect(screen).toBeFocused();
    await page.keyboard.down('ArrowUp');
    await expect
      .poll(async () => Number((await status.getAttribute('data-control-metric')) ?? '0'))
      .toBeGreaterThan(0);
    await page.keyboard.up('ArrowUp');
    await page.screenshot({
      path: resolve(outputDirectory, 'california-games-bmx.png'),
      animations: 'disabled',
    });

    // act
    await page.keyboard.down('KeyQ');
    await page.keyboard.press('KeyP');
    await page.keyboard.up('KeyQ');
    await expect(status).toHaveAttribute('data-phase', 'title');
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-phase', 'menu');
    await page.keyboard.press('ArrowDown');
    await expect(status).toHaveAttribute('data-event', 'surfing');
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-phase', 'playing', { timeout: 5_000 });
    await page.keyboard.press('KeyZ');
    await page.keyboard.down('ArrowLeft');
    await expect
      .poll(async () => Number((await status.getAttribute('data-control-metric')) ?? '0'))
      .toBeGreaterThan(0);
    await page.keyboard.up('ArrowLeft');
    await page.screenshot({
      path: resolve(outputDirectory, 'california-games-surfing.png'),
      animations: 'disabled',
    });

    // act
    await page.keyboard.down('KeyQ');
    await page.keyboard.press('KeyP');
    await page.keyboard.up('KeyQ');
    await expect(status).toHaveAttribute('data-phase', 'title');
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-phase', 'menu');
    await page.keyboard.press('ArrowDown');
    await expect(status).toHaveAttribute('data-event', 'surfing');
    await page.keyboard.press('ArrowDown');
    await expect(status).toHaveAttribute('data-event', 'half-pipe');
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-phase', 'playing', { timeout: 5_000 });
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-primary-pose', 'skate');
    await page.screenshot({
      path: resolve(outputDirectory, 'california-games-half-pipe.png'),
      animations: 'disabled',
    });

    // act
    await page.keyboard.down('KeyQ');
    await page.keyboard.press('KeyP');
    await page.keyboard.up('KeyQ');
    await expect(status).toHaveAttribute('data-phase', 'title');
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-phase', 'menu');
    await page.keyboard.press('ArrowDown');
    await expect(status).toHaveAttribute('data-event', 'surfing');
    await page.keyboard.press('ArrowDown');
    await expect(status).toHaveAttribute('data-event', 'half-pipe');
    await page.keyboard.press('ArrowDown');
    await expect(status).toHaveAttribute('data-event', 'foot-bag');
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-phase', 'playing', { timeout: 5_000 });
    await page.keyboard.press('KeyZ');
    await expect(status).toHaveAttribute('data-primary-pose', 'kick');
    await page.screenshot({
      path: resolve(outputDirectory, 'california-games-foot-bag.png'),
      animations: 'disabled',
    });

    // act
    await page.keyboard.press('KeyP');
    await expect(status).toHaveAttribute('data-status', 'paused');
    await page.keyboard.down('KeyE');
    await page.keyboard.press('KeyP');
    await page.keyboard.up('KeyE');

    // assert
    await expect(status).toHaveAttribute('data-flipped', 'true');
    await expect(status).toHaveAttribute('data-status', 'paused');

    // act
    await page.keyboard.press('KeyP');
    await expect(status).toHaveAttribute('data-status', 'running');
    await page.getByTestId('california-games-instructions').click();
    await expect(view).toHaveAttribute('data-screen', 'instructions');
    await page.getByTestId('california-games-close-instructions').click();
    await page.getByTestId('california-games-players').click();

    // assert
    await expect(status).toHaveAttribute('data-players', '2');
    await expect(status).toHaveAttribute('data-phase', 'intro');
    await page.getByTestId('california-games-sound').click();
    await expect(page.getByTestId('california-games-sound')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.getByTestId('california-games-back-arcade').click();
    await expect(screen).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
