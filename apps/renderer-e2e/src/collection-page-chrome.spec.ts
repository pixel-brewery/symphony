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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    await openCollectionRoute(page, 'skills');
    await expectCollectionChrome(page, 'skills', 'Skills', 'new-skill', [
      'open-skill-catalog',
      'refresh-skills',
    ]);

    await openCollectionRoute(page, 'pull-requests');
    await expect(page.getByTestId('pull-requests-view')).toHaveAttribute('aria-busy', 'false');
    await expectCollectionChrome(page, 'pull-requests', 'Pull Requests', 'create-pull-request', [
      'pull-requests-filter',
      'refresh-pull-requests',
    ]);

    await openCollectionRoute(page, 'actions');
    await expect(page.getByTestId('actions-view')).toHaveAttribute('aria-busy', 'false');
    await expectCollectionChrome(page, 'actions', 'Actions', undefined, [
      'actions-filter',
      'refresh-actions',
    ]);

    await openCollectionRoute(page, 'board');
    await expect(page.getByTestId('board-view')).toHaveAttribute('aria-busy', 'false');
    await expectCollectionChrome(page, 'board', 'Board', 'create-work-item', [
      'board-filter',
      'refresh-board',
    ]);

    // assert
    const flowBoard = page.locator('mosaik-flow-board');
    await expect(flowBoard).toBeVisible();
    await expect(flowBoard).toHaveAttribute('gap', '0px');
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
        create: rect('create-work-item'),
        filter: rect('board-filter'),
      };
    });
    expect(boardActions.create?.width).toBeLessThan(72);
    expect(boardActions.create?.x).toBeLessThan(boardActions.filter?.x ?? 0);

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

async function expectCollectionChrome(
  page: Page,
  route: string,
  label: string,
  primaryActionTestId: string | undefined,
  secondaryActionTestIds: readonly string[],
): Promise<void> {
  const view = page.getByTestId(`${route}-view`);
  // The action group enters with `fadeSlideInDown`, so its box is still translated upward for the
  // first frames. Geometry has to be read after the entrance settles, or it reads ~15px high.
  await view.evaluate(
    async (element) =>
      void (await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map(async (animation) => animation.finished.catch(() => undefined)),
      )),
  );
  const layout = await view.evaluate((element, routeId) => {
    const rect = (target: Element | null) => {
      const box = target?.getBoundingClientRect();
      return box
        ? { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom }
        : undefined;
    };
    const pageElement = element.matches('mosaik-page')
      ? element
      : element.querySelector('mosaik-page');
    return {
      content: rect(element.querySelector('mosaik-page-content')),
      header: rect(element.querySelector(`[test-id="${routeId}-page-header"]`)),
      heading: rect(
        element
          .querySelector(`[test-id="${routeId}-page-header"]`)
          ?.shadowRoot?.querySelector('[part="heading"]') ?? null,
      ),
      page: rect(pageElement),
      route: rect(document.querySelector('[test-id="presenter-route-scroll"]')),
      toolbar: rect(element.querySelector(`[test-id="${routeId}-page-toolbar"]`)),
    };
  }, route);
  expect(layout.page?.width).toBeCloseTo(layout.route?.width ?? 0, 0);
  await expect(page.getByTestId(`${route}-breadcrumb`)).toHaveCount(0);
  await expect(page.getByTestId(`${route}-page-header`)).toContainText(label);
  const toolbar = page.getByTestId(`${route}-page-toolbar`);
  await expect(toolbar.getByRole('toolbar', { name: label })).toBeVisible();
  const primaryActions = toolbar.getByTestId('page-toolbar-primary-actions');
  const secondaryActions = toolbar.getByTestId('page-toolbar-secondary-actions');
  if (primaryActionTestId) {
    await expect(primaryActions).toBeVisible();
    await expect(primaryActions.getByTestId(primaryActionTestId)).toBeVisible();
  } else {
    await expect(primaryActions).toBeHidden();
  }
  await expect(secondaryActions).toBeVisible();
  for (const testId of secondaryActionTestIds) {
    await expect(secondaryActions.getByTestId(testId)).toBeVisible();
  }
  await expect(view.locator('mosaik-page-content')).toHaveAttribute('inset', 'none');
  // The action group is the trailing half of the route's title row: it sits inside the page
  // header, level with the route name, above the content rather than floating over it.
  expect(layout.header?.y).toBeCloseTo(layout.route?.y ?? 0, 0);
  expect(layout.toolbar?.y).toBeGreaterThanOrEqual(layout.header?.y ?? 0);
  expect(layout.toolbar?.bottom).toBeLessThanOrEqual((layout.header?.bottom ?? 0) + 1);
  expect(layout.toolbar?.y).toBeLessThan((layout.route?.y ?? 0) + (layout.route?.height ?? 0) / 2);
  expect(layout.toolbar?.width).toBeLessThan((layout.route?.width ?? 0) / 2);
  // Title on the leading edge, actions on the trailing edge, and the content starts below both.
  expect(layout.heading?.x ?? 0).toBeLessThan(layout.toolbar?.x ?? 0);
  expect((layout.toolbar?.x ?? 0) + (layout.toolbar?.width ?? 0)).toBeLessThanOrEqual(
    (layout.header?.x ?? 0) + (layout.header?.width ?? 0) + 1,
  );
  expect(layout.content?.y ?? 0).toBeGreaterThanOrEqual((layout.header?.bottom ?? 0) - 1);
}
