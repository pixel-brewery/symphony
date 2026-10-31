// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Page } from '@playwright/test';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('keeps workspace search in the active work route and clears its filter', async () => {
  // arrange
  const configurationRoot = resolve(
    'output/playwright',
    `contextual-search-configuration-${process.pid}`,
  );
  const screenshotPath = resolve('output/playwright/contextual-search-expanded.png');
  mkdirSync(resolve('output/playwright'), { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
    },
  });

  // act
  try {
    const page = await prepareMainWindow(app);
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expectNavigationCentred(page);
    await expectNavigationClearOfActions(page);
    await openSearch(page);
    await expect(page.getByTestId('voice-search')).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('[part="search-launcher"]')
          .evaluate((element) => element.getBoundingClientRect().width),
      )
      .toBeGreaterThan(40);
    await expect(page.getByTestId('presenter-navigation')).toBeHidden();
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.getByTestId('toggle-rail').focus();
    await expect(page.getByTestId('global-search-launcher')).toBeVisible();
    await expect(page.getByTestId('presenter-navigation')).toBeVisible();
    await expectNavigationCentred(page);
    await expectNavigationClearOfActions(page);

    await searchAndClear(page, 'Expose execution diagnostics', /\/main\/board$/);
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();

    await page.getByTestId('navigation-pull-requests').click();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();
    await searchAndClear(page, 'release candidate', /\/main\/pull-requests$/);

    await page.getByTestId('navigation-actions').click();
    await expect(page.getByTestId('actions-view')).toBeVisible();
    await searchAndClear(page, 'verification workflow', /\/main\/actions$/);

    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await searchAndClear(page, 'Expose execution diagnostics', /\/main\/orbit$/);
    await expect(page.getByTestId('orbit-webgl')).toBeVisible();

    // assert
    await openSearch(page);
    await expect(page.getByTestId('global-search-launcher-input').locator('input')).toHaveValue('');
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

/**
 * The search launcher rests as a button and becomes the field on activation, so every use of the
 * field opens it first. The field owns focus while it is open and returns to its button as soon as
 * focus leaves the search surface.
 */
async function openSearch(page: Page): Promise<void> {
  const launcher = page.getByTestId('global-search-launcher');
  if (await launcher.count()) {
    await launcher.click();
  }
  await expect(page.getByTestId('global-search-launcher-input')).toBeVisible();
  await expect(page.getByTestId('global-search-launcher-input').locator('input')).toBeFocused();
}

/** Keeps the primary navigation on the complete header band's horizontal centre. */
async function expectNavigationCentred(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const header = document
          .querySelector<HTMLElement>('mosaik-app > mosaik-app-header')
          ?.getBoundingClientRect();
        const navigation = document
          .querySelector<HTMLElement>('[test-id="presenter-navigation"]')
          ?.getBoundingClientRect();
        if (!header || !navigation) return Number.POSITIVE_INFINITY;
        return Math.abs(navigation.x + navigation.width / 2 - (header.x + header.width / 2));
      }),
    )
    .toBeLessThanOrEqual(1);
}

/** Keeps the trailing action group from covering the centred primary navigation. */
async function expectNavigationClearOfActions(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const navigation = document
          .querySelector<HTMLElement>('[test-id="presenter-navigation"]')
          ?.getBoundingClientRect();
        const actions = document
          .querySelector<HTMLElement>('[part="header-actions"]')
          ?.getBoundingClientRect();
        if (!navigation || !actions) return Number.NEGATIVE_INFINITY;
        return actions.x - (navigation.x + navigation.width);
      }),
    )
    .toBeGreaterThanOrEqual(0);
}

async function searchAndClear(page: Page, query: string, clearedUrl: RegExp): Promise<void> {
  await openSearch(page);
  const search = page.getByTestId('global-search-launcher-input');
  await search.locator('input').fill(query);
  await expect
    .poll(() => search.evaluate((element) => (element as HTMLElement & { value: string }).value))
    .toBe(query);
  await search.locator('input').press('Enter');
  await expect(page).toHaveURL(new RegExp(`${clearedUrl.source.slice(0, -1)}\\?q=`));
  await search.evaluate((element) => (element as HTMLElement & { clear(): void }).clear());
  await expect(page).toHaveURL(clearedUrl);
  await search.locator('input').press('Escape');
  await expect(page.getByTestId('global-search-launcher')).toBeVisible();
  await expect(page.getByTestId('presenter-navigation')).toBeVisible();
}
