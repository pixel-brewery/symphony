// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Page } from '@playwright/test';

// #endregion

test('renders full-height collection routes with a title row carrying the actions', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(
    outputDirectory,
    `collection-page-chrome-configuration-${process.pid}`,
  );
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.'],
    cwd: workspace,
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  // act
  try {
    const page = await app.firstWindow();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // Skills left the main window: its packages and actions live in Settings › Skills
    // (skills-settings.spec.ts).

    await openCollectionRoute(page, 'pull-requests');
    await expect(page.getByTestId('pull-requests-view')).toHaveAttribute('aria-busy', 'false');
    // Pull requests carries its title, subtitle, filter menu and refresh in the window toolbar,
    // with no page header and no sync note; the segment and `New pull request` lead the screen.
    await expect(page.getByTestId('pull-requests-page-header')).toHaveCount(0);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Pull requests');
    await expect
      .poll(() =>
        page
          .getByTestId('window-subtitle')
          .evaluate((element) => (element as HTMLElement & { text?: string }).text ?? ''),
      )
      .toMatch(/^(?:.+ · )?\d+ open$/u);
    for (const testId of ['pull-requests-filter', 'refresh-pull-requests']) {
      await expect(page.getByTestId('window-toolbar-actions').getByTestId(testId)).toBeVisible();
    }
    for (const testId of [
      'pull-requests-segment-open',
      'pull-requests-segment-needs-action',
      'pull-requests-segment-drafts',
      'create-pull-request',
    ]) {
      await expect(page.getByTestId('pull-requests-view').getByTestId(testId)).toBeVisible();
    }
    await expect(page.getByTestId('pull-requests-segment-open')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await openCollectionRoute(page, 'actions');
    await expect(page.getByTestId('actions-view')).toHaveAttribute('aria-busy', 'false');
    // Actions carries its title, subtitle, filter and refresh in the window toolbar, with no
    // page header and no sync note; `All runs` and the workflow list fill the route.
    await expect(page.getByTestId('actions-page-header')).toHaveCount(0);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Actions');
    await expect
      .poll(() =>
        page
          .getByTestId('window-subtitle')
          .evaluate((element) => (element as { text?: string }).text ?? ''),
      )
      .not.toMatch(/sync/iu);
    for (const testId of ['actions-filter', 'refresh-actions']) {
      await expect(page.getByTestId('window-toolbar-actions').getByTestId(testId)).toBeVisible();
    }
    await expect(page.getByTestId('actions-workflow-list')).toBeVisible();
    await expect(page.getByTestId('actions-scope-all')).toHaveAttribute('aria-current', 'page');
    // This workspace binds no GitHub repository, so `All runs` explains where workflows come
    // from instead of empty run sections (actions-workflows.spec.ts covers the populated runs).
    await expect(page.getByTestId('actions-empty')).toBeVisible();
    await expect(page.getByTestId('actions-running')).toHaveCount(0);

    await openCollectionRoute(page, 'board');
    await expect(page.getByTestId('board-view')).toHaveAttribute('aria-busy', 'false');

    // assert
    // The Board's title and scope live in the window toolbar with the refresh; the segment, the
    // repository chip, `Filter` and `New work item` live in the board's filter bar, as drawn.
    // No page header and no sync note remain on the screen.
    await expect(page.getByTestId('board-page-header')).toHaveCount(0);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Board');
    const boardSubtitle = () =>
      page
        .getByTestId('window-subtitle')
        .evaluate((element) => (element as { text?: string }).text ?? '');
    await expect.poll(boardSubtitle).toMatch(/ · \d+ work items$/u);
    await expect.poll(boardSubtitle).not.toMatch(/sync/iu);
    await expect(
      page.getByTestId('window-toolbar-actions').getByTestId('refresh-board'),
    ).toBeVisible();
    const filterBar = page.getByTestId('board-filter-bar');
    for (const testId of [
      'board-segment-all',
      'board-segment-attention',
      'board-segment-running',
      'board-segment-mine',
      'board-repository-filter',
      'board-filter',
      'create-work-item',
    ]) {
      await expect(filterBar.getByTestId(testId)).toBeVisible();
    }
    await expect(page.getByTestId('board-segment-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('create-work-item')).toHaveJSProperty('label', 'New work item');
    const flowBoard = page.locator('mosaik-flow-board');
    await expect(flowBoard).toBeVisible();
    await expect(flowBoard).toHaveAttribute('gap', '12px');
    await expect(page.locator('mosaik-flow-board-column').first()).toHaveAttribute(
      'appearance',
      'plain',
    );
    const boardActions = await page.evaluate(() => {
      const rect = (testId: string) => {
        const box = document.querySelector(`[test-id="${testId}"]`)?.getBoundingClientRect();
        return box ? { x: box.x, width: box.width } : undefined;
      };
      return {
        segment: rect('board-segment'),
        repository: rect('board-repository-filter'),
        filter: rect('board-filter'),
        create: rect('create-work-item'),
      };
    });
    expect(boardActions.segment?.x).toBeLessThan(boardActions.repository?.x ?? 0);
    expect(boardActions.repository?.x).toBeLessThan(boardActions.filter?.x ?? 0);
    expect(boardActions.filter?.x).toBeLessThan(boardActions.create?.x ?? 0);

    await page.getByTestId('board-filter').click();
    await expect(page.getByTestId('board-column-filter')).toBeVisible();
    const downwardMenu = await page.evaluate(() => {
      const trigger = document.querySelector('[test-id="board-filter"]')?.getBoundingClientRect();
      const firstFilter = document
        .querySelector('[test-id="board-column-filter"]')
        ?.getBoundingClientRect();
      return {
        filterTop: firstFilter?.top ?? 0,
        triggerBottom: trigger?.bottom ?? 0,
      };
    });
    expect(downwardMenu.filterTop).toBeGreaterThanOrEqual(downwardMenu.triggerBottom);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('board-column-filter')).toBeHidden();
    await page.getByTestId('board-filter').evaluate((element) => (element as HTMLElement).blur());
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: resolve(outputDirectory, 'collection-page-chrome.png'),
      fullPage: true,
    });
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

async function openCollectionRoute(page: Page, route: string): Promise<void> {
  await page.evaluate((target) => {
    window.location.hash = `/main/${target}`;
  }, route);
  await expect(page.getByTestId(`${route}-view`)).toBeVisible();
}
