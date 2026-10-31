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

test('walks into the Lost Caverns and swims its upper river with continuous camera scrolling', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('pitfall-ii-traversal');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(app, page);
    await selectArcadeTheme(app, page, 'light');
    for (const key of [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ])
      await page.keyboard.press(key);
    await expect(page.getByTestId('notification-success')).toContainText('God mode activated');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('notification-success')).toHaveCount(0);
    await page.getByTestId('navigation-arcade').click();
    await page.getByTestId('arcade-play-pitfall-ii').click();
    await page.getByTestId('pitfall-ii-start').click();
    const screen = page.getByTestId('pitfall-ii-screen');
    const status = page.getByTestId('pitfall-ii-status');
    await expect(status).toHaveAttribute('data-status', 'ready');
    const surfaceY = Number(await screen.getAttribute('data-player-y'));
    const surfaceCameraY = Number(await screen.getAttribute('data-camera-y'));

    // act
    // Walk through the first two surface chambers and fall through the next opening.
    // Only the public keyboard controls drive the simulation; God mode prevents hazard resets.
    await screen.focus();
    await page.keyboard.down('ArrowRight');
    await expect(screen).toHaveAttribute('data-pose', 'swim', { timeout: 25_000 });
    await page.keyboard.up('ArrowRight');

    // assert
    await expect(status).toHaveAttribute('data-status', 'playing');
    await expect(status).toHaveAttribute('data-chamber', '2');
    expect(Number(await screen.getAttribute('data-player-y'))).toBeGreaterThan(surfaceY + 45);
    expect(Number(await screen.getAttribute('data-camera-y'))).toBeGreaterThan(surfaceCameraY + 30);
    await expectArcadePlayfield(page, {
      root: 'pitfall-ii-view',
      header: 'pitfall-ii-header',
      playfield: 'pitfall-ii-playfield',
      canvas: 'pitfall-ii-screen',
    });
    const riverX = Number(await screen.getAttribute('data-player-x'));

    // act
    await page.keyboard.down('ArrowRight');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-player-x')), {
        intervals: [25],
        timeout: 6000,
      })
      .toBeGreaterThan(riverX + 25);
    await page.keyboard.up('ArrowRight');

    // assert
    await expect(screen).toHaveAttribute('data-pose', 'swim');
    await page.screenshot({
      path: resolve(outputDirectory, 'pitfall-ii-upper-river-light.png'),
      animations: 'disabled',
    });

    // act
    await page.keyboard.press('KeyP');
    await expect(status).toHaveAttribute('data-status', 'paused');
    const pausedX = await screen.getAttribute('data-player-x');
    const pausedCameraY = await screen.getAttribute('data-camera-y');
    await page.getByTestId('pitfall-ii-menu').click();
    await page.getByTestId('pitfall-ii-resume').click();

    // assert
    await expect(status).toHaveAttribute('data-status', 'playing');
    await expect(screen).toHaveAttribute('data-player-x', pausedX!);
    await expect(screen).toHaveAttribute('data-camera-y', pausedCameraY!);
    await expect(screen).toHaveAttribute('data-pose', 'swim');
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
