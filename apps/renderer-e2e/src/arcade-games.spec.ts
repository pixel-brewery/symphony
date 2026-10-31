// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { enableArcade } from './enableArcade';
import { expectArcadePlayfield } from './expectArcadePlayfield';
import { launchArcadeApp } from './launchArcadeApp';
import { closeSettings } from './closeSettings';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';
import { selectArcadeTheme } from './selectArcadeTheme';

// #endregion

async function resizeGame(
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

async function openGame(page: Page, game: string): Promise<void> {
  await page.getByTestId('navigation-arcade').click();
  await page.getByTestId(`arcade-play-${game}`).click();
  await expect(page).toHaveURL(new RegExp(`#/main/arcade/${game}$`));
}

async function choose(page: Page, select: string, option: string): Promise<void> {
  await page.getByTestId(select).click();
  await page.getByTestId(option).click();
}

async function activateGodMode(page: Page): Promise<void> {
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
}

const GAMES = [
  'pong',
  'breakout',
  'pitfall',
  'pitfall-ii',
  'river-raid',
  'seaquest',
  'jungle-hunt',
  'realsports-boxing',
] as const;

/**
 * The catalog is a grid of equal game cards in the drawn order: at most four per row, each with a
 * 16:10 cover well and its `Play` button inside the card, without horizontal scrolling.
 */
async function expectGameCards(page: Page, columns: number): Promise<void> {
  await expect
    .poll(async () => {
      const cards: { x: number; y: number; width: number; height: number }[] = [];
      for (const game of GAMES) {
        const card = await page.getByTestId(`arcade-game-${game}`).boundingBox();
        const cover = await page.getByTestId(`arcade-cover-${game}`).boundingBox();
        const play = await page.getByTestId(`arcade-play-${game}`).boundingBox();
        if (!card || !cover || !play) return 'missing';
        if (Math.abs(cover.width / cover.height - 16 / 10) > 0.02) return `cover ${game}`;
        if (
          cover.x < card.x ||
          cover.x + cover.width > card.x + card.width + 1 ||
          play.x + play.width > card.x + card.width + 1 ||
          play.y + play.height > card.y + card.height + 1 ||
          play.y < cover.y + cover.height
        )
          return `layout ${game}`;
        cards.push(card);
      }
      const first = cards[0]!;
      if (cards.some((card) => Math.abs(card.width - first.width) > 1)) return 'widths';
      const perRow = cards.filter((card) => Math.abs(card.y - first.y) <= 1).length;
      for (let index = 1; index < cards.length; index += 1) {
        const previous = cards[index - 1]!;
        const card = cards[index]!;
        const sameRow = Math.abs(card.y - previous.y) <= 1;
        if (sameRow ? card.x <= previous.x : card.y <= previous.y) return 'order';
      }
      const overflow = await page
        .getByTestId('arcade-view')
        .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
      return overflow ? 'overflow' : perRow;
    })
    .toBe(columns);
}

test('loads all eight bundled game covers and opens every game in light and dark themes', async () => {
  test.setTimeout(180_000);
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('catalog');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.getByTestId('navigation-arcade')).toHaveCount(0);
    await page.evaluate(() => {
      window.location.hash = '#/main/arcade/pitfall';
    });
    await expect(page).toHaveURL(/#\/main\/home$/);
    await expect(page.getByTestId('home-view')).toBeVisible();
    await enableArcade(page);
    // God mode is shown and entered in the Arcade card of Settings.
    const settings = await openSettings(page);
    await settings.getByTestId('global-settings-section-appearance').click();
    const godModeKeys = Array.from({ length: 10 }, (_, index) =>
      settings.getByTestId(`arcade-god-mode-key-${index}`),
    );
    await expect(settings.getByTestId('arcade-god-mode-sequence')).toBeVisible();
    const idleKeyBackground = await godModeKeys[0]!.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await settings.keyboard.press('ArrowUp');
    await expect(godModeKeys[0]!).toHaveJSProperty('variant', 'success');
    await expect(godModeKeys[1]!).toHaveJSProperty('variant', 'default');
    await expect
      .poll(() => godModeKeys[0]!.evaluate((element) => getComputedStyle(element).backgroundColor))
      .not.toBe(idleKeyBackground);
    await expect(godModeKeys[0]!).toHaveJSProperty('variant', 'default', { timeout: 3_000 });
    await expect
      .poll(() => godModeKeys[0]!.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe(idleKeyBackground);
    await activateGodMode(settings);
    for (const key of godModeKeys) await expect(key).toHaveJSProperty('variant', 'success');
    for (const key of godModeKeys)
      await expect
        .poll(() => key.evaluate((element) => getComputedStyle(element).backgroundColor))
        .not.toBe(idleKeyBackground);
    await settings.keyboard.press('KeyX');
    for (const key of godModeKeys) await expect(key).toHaveJSProperty('variant', 'success');
    await settings.screenshot({ path: resolve(outputDirectory, 'arcade-settings-enabled.png') });
    await closeSettings(page);
    for (const theme of ['light', 'dark'] as const) {
      // act
      await resizeGame(app, page, 1440, 900);
      await selectArcadeTheme(page, theme);
      await page.getByTestId('navigation-arcade').click();

      // assert
      await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Arcade');
      await expect(page.getByTestId('window-subtitle')).toHaveJSProperty('text', '8 games');
      await expect(
        page.getByTestId('window-toolbar').getByTestId('arcade-open-leaderboard'),
      ).toBeVisible();
      for (const game of GAMES) {
        const cover = page.getByTestId(`arcade-cover-${game}`);
        await expect(cover).toBeVisible();
        await expect(cover).toHaveJSProperty('state', 'done');
        await expect(cover).toHaveJSProperty('fit', 'contain');
        await expect(cover).toHaveJSProperty('src', `arcade/${game}.webp`);
      }
      await expect(page.getByTestId('arcade-players-pong')).toHaveJSProperty('text', '2 players');
      await expect(page.getByTestId('arcade-players-breakout')).toHaveJSProperty(
        'text',
        '1–4 players',
      );
      await expect(page.getByTestId('arcade-players-pitfall')).toHaveJSProperty('text', '1 player');
      await expectGameCards(page, 4);
      await page.screenshot({ path: resolve(outputDirectory, `arcade-catalog-${theme}.png`) });
      await resizeGame(app, page, 940, 700);
      await expectGameCards(page, 2);
      await page.screenshot({
        path: resolve(outputDirectory, `arcade-catalog-${theme}-wrapped.png`),
      });
      await resizeGame(app, page, 500, 700);
      await expectGameCards(page, 1);
      await page.screenshot({
        path: resolve(outputDirectory, `arcade-catalog-${theme}-compact.png`),
      });
      await page.getByTestId('arcade-play-realsports-boxing').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('arcade-play-realsports-boxing')).toBeInViewport();
      await page.getByTestId('arcade-play-pong').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('arcade-play-pong')).toBeInViewport();
      await page.getByTestId('arcade-play-pong').focus();
      for (const game of GAMES.slice(1)) {
        await page.keyboard.press('Tab');
        await expect(page.getByTestId(`arcade-play-${game}`).getByRole('button')).toBeFocused();
      }
      await resizeGame(app, page, 1440, 900);
      for (const [game, title, key] of [
        ['pitfall', 'Pitfall!', 'Enter'],
        ['pitfall-ii', 'Pitfall II: Lost Caverns', 'Space'],
        ['breakout', 'Breakout', 'Space'],
        ['realsports-boxing', 'RealSports Boxing', 'Enter'],
        ['jungle-hunt', 'Jungle Hunt', 'Enter'],
        ['pong', 'Pong', 'Space'],
        ['seaquest', 'Seaquest', 'Enter'],
        ['river-raid', 'River Raid', 'Space'],
      ]) {
        // act
        await page.getByTestId('navigation-arcade').click();
        const tile = page.getByTestId(`arcade-play-${game}`);
        await expect(tile.getByRole('button')).toHaveAccessibleName(`Play ${title}`);
        await tile.focus();
        await tile.press(key ?? 'Enter');
        await expect(page).toHaveURL(new RegExp(`#/main/arcade/${game}$`));

        // assert
        await expect(page.getByTestId(`${game}-view`)).toHaveAttribute('data-screen', 'intro');
        if (game === 'breakout') {
          await expect(page.getByTestId('breakout-menu-dialog')).toBeVisible();
          await expect(page.locator('.cdk-overlay-backdrop').last()).toBeVisible();
        }
        await page.screenshot({
          path: resolve(outputDirectory, `arcade-${game}-menu-${theme}.png`),
        });
        if (game === 'breakout') await page.getByTestId('breakout-all-games').click();
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});

test('restores new-game results beside existing Arcade history after restarting Symphony', async () => {
  // arrange
  const runtime = await launchArcadeApp('pitfall-ii-history');
  const { configurationRoot, outputDirectory } = runtime;
  let app = runtime.app;
  const errors: string[] = [];
  try {
    let page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(page);
    await page.evaluate(() => {
      localStorage.setItem(
        'symphony.arcade.leaderboard.v1',
        JSON.stringify([
          {
            id: 'existing-pitfall-expedition',
            game: 'pitfall',
            completedAt: '2026-09-17T16:00:00.000Z',
            score: 8000,
            treasures: 2,
            elapsedSeconds: 230,
            outcome: 'lost',
          },
          {
            id: 'completed-lost-caverns-expedition',
            game: 'pitfall-ii',
            completedAt: '2026-09-18T16:00:00.000Z',
            score: 199000,
            goldCollected: 28,
            elapsedSeconds: 1450,
            outcome: 'completed',
          },
          ...(['jungle-hunt', 'seaquest', 'river-raid'] as const).map((game) => ({
            id: `${game}-finished`,
            game,
            completedAt: '2026-09-18T16:00:00.000Z',
            score: 25000,
            level: 3,
            player: 1,
            elapsedSeconds: 600,
            outcome: 'lost',
          })),
          {
            id: 'pong-finished',
            game: 'pong',
            completedAt: '2026-09-18T16:00:00.000Z',
            scores: [11, 7],
            targetScore: 11,
            winner: 0,
            elapsedSeconds: 180,
            opponent: 'human',
          },
        ]),
      );
    });

    // act
    await app.close();
    app = (await launchArcadeApp('pitfall-ii-history', false)).app;
    page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    for (const theme of ['light', 'dark'] as const) {
      await selectArcadeTheme(page, theme);
      await page.getByTestId('navigation-arcade').click();
      await page.getByTestId('arcade-open-leaderboard').click();

      // assert
      const previous = page.getByTestId('leaderboard-pitfall-result');
      await expect(previous).toHaveCount(1);
      await expect(previous).toHaveAttribute('data-score', '8000');
      const result = page.getByTestId('leaderboard-pitfall-ii-result');
      await expect(result).toHaveCount(1);
      await expect(result).toHaveAttribute('data-score', '199000');
      await expect(result).toHaveAttribute('data-gold', '28');
      await expect(result).toHaveAttribute('data-outcome', 'completed');
      await result.scrollIntoViewIfNeeded();
      await expect(result).toBeInViewport();
      await page.screenshot({
        path: resolve(outputDirectory, `arcade-pitfall-ii-leaderboard-${theme}.png`),
      });
      for (const game of ['jungle-hunt', 'seaquest', 'river-raid']) {
        const additional = page.getByTestId(`leaderboard-${game}-result`);
        await expect(additional).toHaveCount(1);
        await expect(additional).toHaveAttribute('data-score', '25000');
        await expect(additional).toHaveAttribute('data-level', '3');
        await additional.scrollIntoViewIfNeeded();
        await expect(additional).toBeInViewport();
      }
      const pong = page.getByTestId('leaderboard-pong-result');
      await expect(pong).toHaveCount(1);
      await expect(pong).toHaveAttribute('data-winner', '0');
      await pong.scrollIntoViewIfNeeded();
      await expect(pong).toBeInViewport();
      await page.screenshot({
        path: resolve(outputDirectory, `arcade-new-games-leaderboard-${theme}.png`),
      });
      await page.getByTestId('arcade-leaderboard-close').click();
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});

test('plays Breakout with mouse and keys through a full match and configures partner games', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('breakout');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(page);
    await openGame(page, 'breakout');
    await expect(page.getByTestId('breakout-menu-dialog')).toBeVisible();
    await expect(page.locator('.cdk-overlay-backdrop').last()).toBeVisible();
    await page.getByTestId('breakout-instructions').click();
    await expect(page.getByTestId('breakout-menu-dialog')).toContainText(
      'Each team has five balls and two walls to clear.',
    );
    await page.getByTestId('breakout-back-title').click();

    // act
    await page.getByTestId('breakout-start').click();
    const view = page.getByTestId('breakout-view');
    const screen = page.getByTestId('breakout-screen');
    const status = page.getByTestId('breakout-status');

    // assert
    await expect(view).toHaveAttribute('data-screen', 'game');
    await expect(status).toHaveAttribute('data-status', 'ready');
    await expect(status).toHaveAttribute('data-balls', '5');
    await expectArcadePlayfield(page, {
      root: 'breakout-view',
      header: 'breakout-header',
      playfield: 'breakout-playfield',
      canvas: 'breakout-screen',
    });
    const initialX = Number(await screen.getAttribute('data-paddle-x'));
    await screen.focus();
    await page.keyboard.down('ArrowLeft');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-paddle-x')))
      .toBeLessThan(initialX - 5);
    await page.keyboard.up('ArrowLeft');
    let bounds = await screen.boundingBox();
    if (!bounds) throw new Error('The Breakout playfield has no bounds.');
    await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.9);
    await expect
      .poll(async () => Number(await screen.getAttribute('data-paddle-x')))
      .toBeGreaterThan(100);
    await page.mouse.click(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.9);
    await expect(status).toHaveAttribute('data-status', 'playing');
    await expect
      .poll(async () => Number(await status.getAttribute('data-score')))
      .toBeGreaterThan(0);

    // act
    await page.keyboard.press('KeyP');

    // assert
    await expect(status).toHaveAttribute('data-status', 'paused');
    const pausedX = await screen.getAttribute('data-ball-x');
    const pausedY = await screen.getAttribute('data-ball-y');
    await page.keyboard.press('ArrowRight');
    await expect(screen).toHaveAttribute('data-ball-x', pausedX ?? '');
    await expect(screen).toHaveAttribute('data-ball-y', pausedY ?? '');
    await page.getByTestId('breakout-menu').click();
    await page.getByTestId('breakout-continue').click();
    await expect(view).toHaveAttribute('data-screen', 'game');
    await expect(status).toHaveAttribute('data-status', 'playing');
    const sound = page.getByTestId('breakout-sound');
    const previousSound = await sound.getAttribute('aria-pressed');
    await sound.click();
    await expect(sound).toHaveAttribute(
      'aria-pressed',
      previousSound === 'true' ? 'false' : 'true',
    );

    // act
    await page.getByTestId('breakout-reset').click();
    await resizeGame(app, page, 1440, 900);

    // assert
    await expectArcadePlayfield(page, {
      root: 'breakout-view',
      header: 'breakout-header',
      playfield: 'breakout-playfield',
      canvas: 'breakout-screen',
    });
    await page.screenshot({ path: resolve(outputDirectory, 'arcade-breakout-playing.png') });
    bounds = await screen.boundingBox();
    if (!bounds) throw new Error('The Breakout playfield has no bounds.');
    // Consume five balls by moving the real paddle away from the falling ball.
    for (let remaining = 5; remaining > 0; remaining--) {
      await expect(status).toHaveAttribute('data-status', 'ready');
      await screen.focus();
      await page.keyboard.press('Space');
      await expect(status).toHaveAttribute('data-status', 'playing');
      await expect
        .poll(
          async () => {
            const x = Number(await screen.getAttribute('data-ball-x'));
            await page.mouse.move(
              bounds.x + bounds.width * (x < 80 ? 0.9 : 0.1),
              bounds.y + bounds.height * 0.9,
            );
            return Number(await status.getAttribute('data-balls'));
          },
          { intervals: [50], timeout: 15_000 },
        )
        .toBe(remaining - 1);
    }
    await expect(status).toHaveAttribute('data-status', 'gameOver');
    await expect(page.getByTestId('breakout-result')).toBeVisible();
    await page.getByTestId('breakout-rematch').click();
    await expect(status).toHaveAttribute('data-status', 'ready');
    await expect(status).toHaveAttribute('data-balls', '5');

    // act
    await page.getByTestId('breakout-back-arcade').click();
    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await activateGodMode(page);
    await openGame(page, 'breakout');
    await page.getByTestId('breakout-start').click();
    await expect(view).toHaveAttribute('data-screen', 'game');
    await expect(status).toHaveAttribute('data-status', 'ready');
    await screen.focus();
    await page.keyboard.press('Space');
    let reachedSafetyEdge = false;

    // assert
    await expect
      .poll(
        async () => {
          const x = Number(await screen.getAttribute('data-ball-x'));
          const y = Number(await screen.getAttribute('data-ball-y'));
          await page.mouse.move(
            bounds.x + bounds.width * (x < 80 ? 0.9 : 0.1),
            bounds.y + bounds.height * 0.9,
          );
          if (y > 185) reachedSafetyEdge = true;
          return (
            reachedSafetyEdge &&
            y < 170 &&
            (await status.getAttribute('data-status')) === 'playing' &&
            (await status.getAttribute('data-balls')) === '5'
          );
        },
        { intervals: [25], timeout: 15_000 },
      )
      .toBe(true);

    // act
    await page.getByTestId('breakout-menu').click();
    await choose(page, 'breakout-variation', 'breakout-variation-11');
    await choose(page, 'breakout-players', 'breakout-players-4');
    await choose(page, 'breakout-difficulty-a', 'breakout-team-a-difficulty-b');
    await page.getByTestId('breakout-start').click();

    // assert
    await expect(view).toHaveAttribute('data-screen', 'game');
    await expect(status).toHaveAttribute('data-variation', '11');
    await expect(status).toHaveAttribute('data-players', '4');
    const paddles = JSON.parse((await screen.getAttribute('data-paddles')) ?? '[]') as {
      x: number;
      width: number;
      region: string;
    }[];
    expect(paddles.map((paddle) => paddle.region)).toEqual(['left', 'right']);
    expect(paddles.map((paddle) => paddle.width)).toEqual([15, 15]);
    await screen.focus();
    await page.keyboard.down('KeyL');
    await expect
      .poll(
        async () =>
          (JSON.parse((await screen.getAttribute('data-paddles')) ?? '[]') as { x: number }[])[1]
            ?.x ?? 0,
      )
      .toBeGreaterThan((paddles[1]?.x ?? 0) + 5);
    await page.keyboard.up('KeyL');
    await page.keyboard.press('KeyK');
    await expect(status).toHaveAttribute('data-status', 'playing');
    await page.getByTestId('breakout-back-arcade').click();
    await expect(screen).toHaveCount(0);
    await page.getByTestId('arcade-open-leaderboard').click();
    await expect(page.getByTestId('leaderboard-breakout-result')).toHaveCount(1);
    await expect(page.getByTestId('leaderboard-breakout-result')).toHaveAttribute(
      'data-variation',
      '1',
    );
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});

test('plays RealSports Boxing with two people through a TKO, rematch and computer selection', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launchArcadeApp('boxing');
  const errors: string[] = [];
  try {
    const page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    await enableArcade(page);
    await openGame(page, 'realsports-boxing');
    await page.getByTestId('boxing-instructions').click();
    await expect(page.getByTestId('realsports-boxing-view')).toHaveAttribute(
      'data-screen',
      'instructions',
    );
    await page.getByTestId('boxing-back-title').click();
    await choose(page, 'boxing-players', 'boxing-mode-local');

    // act
    await page.getByTestId('boxing-start').click();
    const screen = page.getByTestId('boxing-screen');
    const status = page.getByTestId('boxing-status');

    // assert
    await expect(status).toHaveAttribute('data-status', 'fighting');
    await expect(status).toHaveAttribute('data-players', '2');
    await expectArcadePlayfield(page, {
      root: 'realsports-boxing-view',
      header: 'boxing-header',
      playfield: 'boxing-playfield',
      canvas: 'boxing-screen',
    });
    const initialY = Number(await screen.getAttribute('data-player2-y'));
    await screen.focus();
    await page.keyboard.down('KeyW');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-player2-y')))
      .toBeLessThan(initialY - 3);
    await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyS');
    await expect
      .poll(async () => Number(await screen.getAttribute('data-player2-y')), { intervals: [10] })
      .toBeGreaterThanOrEqual(initialY);
    await page.keyboard.up('KeyS');

    // act
    await page.keyboard.press('KeyP');

    // assert
    await expect(status).toHaveAttribute('data-status', 'paused');
    const pausedTime = await status.getAttribute('data-time');
    const pausedX = await screen.getAttribute('data-player1-x');
    await page.keyboard.press('ArrowRight');
    await expect(screen).toHaveAttribute('data-player1-x', pausedX ?? '');
    await expect(status).toHaveAttribute('data-time', pausedTime ?? '');
    await page.getByTestId('boxing-menu').click();
    await page.getByTestId('boxing-resume').click();
    await expect(status).toHaveAttribute('data-status', 'fighting');
    const sound = page.getByTestId('boxing-sound');
    const previousSound = await sound.getAttribute('aria-pressed');
    await sound.click();
    await expect(sound).toHaveAttribute(
      'aria-pressed',
      previousSound === 'true' ? 'false' : 'true',
    );
    await resizeGame(app, page, 1440, 900);
    await expectArcadePlayfield(page, {
      root: 'realsports-boxing-view',
      header: 'boxing-header',
      playfield: 'boxing-playfield',
      canvas: 'boxing-screen',
    });

    // act
    // Walk to the opponent, then land twelve unanswered jabs using ordinary controls.
    await screen.focus();
    await page.keyboard.down('ArrowRight');
    await expect
      .poll(
        async () =>
          Number(await screen.getAttribute('data-player2-x')) -
          Number(await screen.getAttribute('data-player1-x')),
      )
      .toBeLessThan(23);
    for (let punch = 1; punch <= 12; punch++) {
      const previousScore = Number(await screen.getAttribute('data-player1-score'));
      await page.keyboard.down('Space');
      await expect
        .poll(async () => Number(await screen.getAttribute('data-player1-score')), {
          intervals: [25],
        })
        .toBeGreaterThan(previousScore);
      await page.keyboard.up('Space');
      const releaseFrame = Number(await screen.getAttribute('data-frame'));
      await expect
        .poll(async () => Number(await screen.getAttribute('data-frame')), { intervals: [25] })
        .toBeGreaterThan(releaseFrame + 21);
    }
    await page.keyboard.up('ArrowRight');

    // assert
    await expect(page.getByTestId('boxing-result')).toBeVisible();
    await expect(page.getByTestId('boxing-result')).toHaveAttribute('data-winner', '0');
    await expect(page.getByTestId('boxing-result')).toHaveAttribute(
      'data-reason',
      'technical-knockout',
    );
    await page.screenshot({ path: resolve(outputDirectory, 'arcade-boxing-result.png') });
    await page.getByTestId('boxing-rematch').click();
    await expect(status).toHaveAttribute('data-round', '1');
    await expect(screen).toHaveAttribute('data-player1-score', '0');
    await expect(page.getByTestId('boxing-result')).toHaveCount(0);

    // act
    await page.getByTestId('boxing-menu').click();
    await choose(page, 'boxing-players', 'boxing-mode-cpu');
    await choose(page, 'boxing-difficulty', 'boxing-difficulty-a');
    await choose(page, 'boxing-contender-1', 'boxing-fighter-1-lefty-oleary');
    await choose(page, 'boxing-contender-2', 'boxing-fighter-2-jabbin-jack');
    await page.getByTestId('boxing-start').click();

    // assert
    await expect(status).toHaveAttribute('data-players', '1');
    await expect(status).toHaveAttribute('data-difficulty', 'A');
    await expect(status).toHaveAttribute('data-contender-1', 'lefty-oleary');
    await expect(status).toHaveAttribute('data-contender-2', 'jabbin-jack');
    await expect(status).toHaveAttribute('data-status', 'fighting');
    await page.screenshot({ path: resolve(outputDirectory, 'arcade-boxing-playing.png') });
    await page.getByTestId('boxing-back-arcade').click();
    await expect(screen).toHaveCount(0);
    await page.getByTestId('arcade-open-leaderboard').click();
    await expect(page.getByTestId('leaderboard-boxing-result')).toHaveCount(1);
    await expect(page.getByTestId('leaderboard-boxing-result')).toHaveAttribute('data-winner', '0');
    await expect(page.getByTestId('leaderboard-boxing-result')).toHaveAttribute(
      'data-reason',
      'technical-knockout',
    );
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { recursive: true, force: true });
  }
});
