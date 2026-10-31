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

test('flies River Raid, preserves a paused flight, alternates pilots and records a normally lost squadron', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('river-raid-controls');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(app, page);
    for (const theme of ['light', 'dark'] as const) {
      // act
      await selectArcadeTheme(app, page, theme);
      await page.getByTestId('navigation-arcade').click();
      await page.getByTestId('arcade-play-river-raid').click();
      const view = page.getByTestId('river-raid-view');
      const status = page.getByTestId('river-raid-status');
      const screen = page.getByTestId('river-raid-screen');
      await page.getByTestId('river-raid-instructions').click();
      await expect(view).toHaveAttribute('data-screen', 'instructions');
      await page.getByTestId('river-raid-back-title').click();
      await page.screenshot({ path: resolve(outputDirectory, `river-raid-intro-${theme}.png`) });
      await page.getByTestId('river-raid-start').click();

      // assert
      await expect(status).toHaveAttribute('data-status', 'ready');
      await expect(status).toHaveAttribute('data-fuel', '1');
      await expectArcadePlayfield(page, {
        root: 'river-raid-view',
        header: 'river-raid-header',
        playfield: 'river-raid-playfield',
        canvas: 'river-raid-screen',
      });
      await page.screenshot({ path: resolve(outputDirectory, `river-raid-ready-${theme}.png`) });

      // act
      await screen.focus();
      await page.keyboard.down('ArrowRight');
      await expect
        .poll(async () => Number(await screen.getAttribute('data-player-x')))
        .toBeGreaterThan(79);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.press('KeyP');
      await expect(status).toHaveAttribute('data-status', 'paused');
      const fuel = await status.getAttribute('data-fuel');
      const position = await screen.getAttribute('data-distance');
      await page.getByTestId('river-raid-menu').click();
      await page.getByTestId('river-raid-instructions').click();
      await page.getByTestId('river-raid-back-title').click();
      await page.getByTestId('river-raid-resume').click();
      await page.keyboard.press('KeyP');

      // assert
      await expect(status).toHaveAttribute('data-status', 'paused');
      expect(Number(await status.getAttribute('data-fuel'))).toBeLessThanOrEqual(Number(fuel));
      expect(Number(await screen.getAttribute('data-distance'))).toBeGreaterThanOrEqual(
        Number(position),
      );
      await page.getByTestId('river-raid-sound').click();
      await expect(page.getByTestId('river-raid-sound')).toHaveAttribute('aria-pressed', 'false');
      await page.getByTestId('river-raid-reset').click();
      await expect(status).toHaveAttribute('data-status', 'ready');
      await expect(status).toHaveAttribute('data-score', '0');
      await expect(status).toHaveAttribute('data-fuel', '1');
      await page.getByTestId('river-raid-back-arcade').click();
      await expect(screen).toHaveCount(0);
    }

    // act
    await page.getByTestId('arcade-play-river-raid').click();
    await page.getByTestId('river-raid-two-players').click();
    await page.getByTestId('river-raid-start').click();
    const status = page.getByTestId('river-raid-status');
    const screen = page.getByTestId('river-raid-screen');
    await screen.focus();
    await page.keyboard.down('ArrowLeft');
    await expect(status).toHaveAttribute('data-status', 'crashed');
    await page.keyboard.up('ArrowLeft');
    await expect(status).toHaveAttribute('data-status', 'ready');

    // assert
    await expect(status).toHaveAttribute('data-player', '2');
    await expect(status).toHaveAttribute('data-fuel', '1');

    // act
    await page.getByTestId('river-raid-menu').click();
    await page.getByTestId('river-raid-one-player').click();
    await page.getByTestId('river-raid-start').click();
    for (let flight = 0; flight < 4; flight++) {
      await screen.focus();
      await page.keyboard.down('ArrowLeft');
      await expect(status).toHaveAttribute('data-status', 'crashed');
      await page.keyboard.up('ArrowLeft');
      await expect(status).toHaveAttribute('data-status', flight === 3 ? 'ended' : 'ready');
    }

    // assert
    await expect(page.getByTestId('river-raid-results')).toBeVisible();
    await expect(status).toHaveAttribute('data-score', '0');
    await page.screenshot({ path: resolve(outputDirectory, 'river-raid-mission-over.png') });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
