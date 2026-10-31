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
  const screenshotPath = resolve('output/playwright/contextual-search-palette.png');
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
    await expect(page.getByTestId('voice-search')).toHaveCount(0);

    await page.getByTestId('navigation-board').click();
    await searchAndClear(page, 'Board', 'Expose execution diagnostics', /\/main\/board$/u);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();

    await page.getByTestId('navigation-pull-requests').click();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();
    await searchAndClear(page, 'Pull requests', 'release candidate', /\/main\/pull-requests$/u);

    await page.getByTestId('navigation-actions').click();
    await expect(page.getByTestId('actions-view')).toBeVisible();
    await searchAndClear(page, 'Actions', 'verification workflow', /\/main\/actions$/u);

    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await searchAndClear(page, 'Orbit', 'Expose execution diagnostics', /\/main\/orbit$/u);
    await expect(page.getByTestId('orbit-webgl')).toBeVisible();

    // assert
    await page.getByTestId('global-search-launcher').click();
    await expect(page.getByTestId('command-palette-search').locator('input')).toHaveValue('');
    await expect(
      page.getByTestId('command-palette-option-command:contextual-filter-clear'),
    ).toHaveCount(0);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

/**
 * The toolbar search field opens the command palette. On a screen with contextual search the
 * palette's `Filter <screen> by “…”` sets the screen's `q` filter, and with nothing typed
 * `Clear the <screen> filter` removes it again.
 */
async function searchAndClear(
  page: Page,
  screen: string,
  query: string,
  clearedUrl: RegExp,
): Promise<void> {
  const palette = page.getByTestId('command-palette');
  const search = page.getByTestId('command-palette-search').locator('input');
  await page.getByTestId('global-search-launcher').click();
  await expect(palette).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill(query);
  const filter = page.getByTestId('command-palette-option-command:contextual-filter');
  await expect(filter).toContainText(`Filter ${screen} by “${query}”`);
  await filter.click();
  await expect(palette).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${clearedUrl.source.slice(0, -1)}\\?q=`, 'u'));

  await page.getByTestId('global-search-launcher').click();
  const clear = page.getByTestId('command-palette-option-command:contextual-filter-clear');
  await expect(clear).toContainText(`Clear the ${screen} filter`);
  await expect(clear).toContainText(`Filtered by “${query}”`);
  await clear.click();
  await expect(palette).toBeHidden();
  await expect(page).toHaveURL(clearedUrl);
}
