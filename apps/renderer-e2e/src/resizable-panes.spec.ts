// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expect,
  test,
  _electron as electron,
  type ElectronApplication,
  type Locator,
  type Page,
} from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import type { BrowserWindow } from 'electron';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

/** Where the window chrome sits and how far the document and the window surface scrolled. */
interface IChromePosition {
  readonly toolbarY: number;
  readonly sidebarY: number;
  readonly sidebarX: number;
  readonly documentScrollTop: number;
  readonly windowScrollTop: number;
}

/** Starts the desktop process with disposable storage, so remembered pane sizes start empty. */
async function launch(
  scenario: string,
  environment: Readonly<Record<string, string>> = {},
): Promise<{ app: ElectronApplication; configurationRoot: string; outputDirectory: string }> {
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `resizable-panes-${scenario}-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '50',
      ...environment,
    },
  });
  return { app, configurationRoot, outputDirectory };
}

/** Drags a split divider horizontally to a window x coordinate with the real pointer. */
async function dragDivider(page: Page, divider: Locator, x: number): Promise<void> {
  const box = await divider.boundingBox();
  if (!box) throw new Error('The split divider is not rendered.');
  const y = box.y + Math.min(box.height / 2, 200);
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
}

/** Width of an element, in CSS pixels. */
async function widthOf(locator: Locator): Promise<number> {
  return (await locator.boundingBox())?.width ?? 0;
}

/** Asserts that a measured pane size is the expected size within one pixel. */
function expectSize(actual: number, expected: number): void {
  expect(actual).toBeGreaterThanOrEqual(expected - 1);
  expect(actual).toBeLessThanOrEqual(expected + 1);
}

/** The remembered size of a pane, as the renderer stores it on this device. */
function rememberedSize(page: Page, pane: string): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), `symphony.pane.${pane}`);
}

/** Reads where the window chrome sits and whether anything outside the panes scrolled. */
function chromePosition(page: Page): Promise<IChromePosition> {
  return page.evaluate(() => {
    const rect = (testId: string) =>
      document.querySelector(`[test-id="${testId}"]`)?.getBoundingClientRect();
    return {
      toolbarY: rect('window-toolbar')?.y ?? Number.NaN,
      sidebarY: rect('window-sidebar')?.y ?? Number.NaN,
      sidebarX: rect('window-sidebar')?.x ?? Number.NaN,
      documentScrollTop: document.scrollingElement?.scrollTop ?? Number.NaN,
      windowScrollTop: document.querySelector<HTMLElement>('[part~="window"]')?.scrollTop ?? 0,
    };
  });
}

/** Asserts that the toolbar and the sidebar are where the window draws them. */
async function expectChromeInPlace(page: Page): Promise<void> {
  expect(await chromePosition(page)).toEqual({
    toolbarY: 0,
    sidebarY: 0,
    sidebarX: 0,
    documentScrollTop: 0,
    windowScrollTop: 0,
  });
  await expect(page.getByTestId('window-toolbar')).toBeInViewport();
  await expect(page.getByTestId('navigation-settings')).toBeInViewport();
  await expect(page.getByTestId('window-status-bar')).toBeInViewport();
}

/** Reloads the main window's renderer from the main process, as a relaunch of the UI would. */
async function reloadRenderer(app: ElectronApplication, page: Page): Promise<void> {
  const window = await app.browserWindow(page);
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    window.evaluate((browserWindow: BrowserWindow) => browserWindow.webContents.reload()),
  ]);
  await expect(page.getByTestId('window-sidebar')).toBeVisible();
}

/**
 * Binds the simulated items' repository and an analysis skill, then completes an analysis of every
 * simulated item, so the Inbox lists more decisions than its list pane can show at once.
 *
 * @returns The number of completed analyses.
 */
async function seedInboxEntries(page: Page, localPath: string): Promise<number> {
  const started = await page.evaluate(async (path) => {
    const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
    const settings = await api.request('settings.get', {});
    const workspaceId = settings.workspaces[0]!.id;
    const analysisSkill = await api.request('skills.save', {
      skill: {
        name: 'resizable-panes-analysis',
        description: 'Analysis skill for the resizable panes journey.',
        instructions: 'Analyze the selected work item and return an implementation-ready plan.',
        openaiYaml: '',
        files: [],
      },
    });
    const connection = {
      id: 'resizable-panes-github',
      workspaceId,
      kind: 'github' as const,
      displayName: 'Resizable panes GitHub',
      hostname: 'github.com',
      gitProtocol: 'https' as const,
    };
    const repository = {
      id: 'resizable-panes-repository',
      workspaceId,
      sourceControlConnectionId: connection.id,
      displayName: 'example/platform',
      provider: 'github' as const,
      host: 'github.com',
      owner: 'example',
      name: 'platform',
      defaultBranch: 'main',
      localPath: path,
      enabled: true,
    };
    await api.request('settings.save', {
      settings: {
        ...settings,
        connections: [...settings.connections, connection],
        repositoryBindings: [...settings.repositoryBindings, repository],
        deliveryContexts: [
          {
            id: 'resizable-panes-context',
            workspaceId,
            displayName: 'Resizable panes',
            workItemSourceIds: settings.workItemSources
              .filter((source) => source.workspaceId === workspaceId)
              .map((source) => source.id),
            repositoryBindingIds: [repository.id],
            ciBindingIds: [],
            agentTeamId: settings.agentTeams[0]!.id,
            defaultRepositoryBindingId: repository.id,
            enabled: true,
          },
        ],
        agentTeams: settings.agentTeams.map((team) => ({
          ...team,
          assignments: team.assignments.map((assignment) =>
            assignment.role === 'analysis'
              ? { ...assignment, skillId: analysisSkill.id }
              : assignment,
          ),
        })),
      },
    });
    await api.request('repositories.prepare', { repositoryBindingId: repository.id });
    // Backlog items wait for a human decision, so they move to the column whose item is analysed
    // first and are analysed there.
    const { workItems } = await api.request('snapshot.get', {});
    const startable = workItems.find((item) => item.stageId === 'qualified');
    if (!startable?.boardColumnId) throw new Error('No simulated item can be analysed.');
    for (const item of workItems) {
      if (item.boardColumnId !== startable.boardColumnId)
        await api.request('work-items.move', {
          workItemId: item.id,
          boardColumnId: startable.boardColumnId,
        });
      await api.request('analyzer.start', { simulateFailure: false, workItemId: item.id });
    }
    return workItems.length;
  }, localPath);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          const snapshot = await api.request('snapshot.get', {});
          return snapshot.executions.filter(
            (execution) => execution.kind === 'analysis' && execution.state === 'succeeded',
          ).length;
        }),
      { timeout: 60_000 },
    )
    .toBe(started);
  return started;
}

test('resizes the sidebar within its bounds and remembers its width across a reload', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launch('sidebar');

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    // Overview has no split of its own, so the window split's divider is the only one.
    const divider = page.getByTestId('window-split').locator('[part="divider"]');
    const sidebar = page.getByTestId('window-sidebar');
    const toolbar = page.getByTestId('window-toolbar');
    await expect(divider).toHaveCount(1);
    expectSize(await widthOf(sidebar), 240);
    expect(await rememberedSize(page, 'window.sidebar')).not.toBe('300');

    // act
    await dragDivider(page, divider, 300);

    // assert: the sidebar follows the divider and the content starts beside it.
    expectSize(await widthOf(sidebar), 300);
    const sidebarBox = (await sidebar.boundingBox())!;
    const toolbarBox = (await toolbar.boundingBox())!;
    expect(toolbarBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width);
    expect(toolbarBox.x + toolbarBox.width).toBeCloseTo(1040, 0);
    await expect.poll(() => rememberedSize(page, 'window.sidebar')).toBe('300');

    // act
    await dragDivider(page, divider, 700);

    // assert: never wider than 360 px.
    expectSize(await widthOf(sidebar), 360);

    // act
    await dragDivider(page, divider, 40);

    // assert: never narrower than 200 px; the sidebar keeps its destinations.
    expectSize(await widthOf(sidebar), 200);
    await expect(page.getByTestId('navigation-home')).toBeVisible();

    // act
    await dragDivider(page, divider, 320);
    await expect.poll(() => rememberedSize(page, 'window.sidebar')).toBe('320');
    await reloadRenderer(app, page);

    // assert: the dragged width survives the reload.
    await expect.poll(() => widthOf(sidebar)).toBeGreaterThanOrEqual(319);
    expectSize(await widthOf(sidebar), 320);
    await page.screenshot({ path: resolve(outputDirectory, 'resizable-sidebar.png') });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

test('resizes the Inbox list by its divider without moving the sidebar', async () => {
  // arrange
  const { app, configurationRoot } = await launch('inbox');

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await page.getByTestId('navigation-inbox').click();
    await expect(page.getByTestId('inbox-view')).toBeVisible();
    const list = page.getByTestId('inbox-list');
    const divider = page.getByTestId('inbox-view').locator('[part="divider"]');
    const sidebarWidth = await widthOf(page.getByTestId('window-sidebar'));
    expectSize(await widthOf(list), 400);
    const listX = (await list.boundingBox())!.x;

    // act
    await dragDivider(page, divider, listX + 480);

    // assert
    expectSize(await widthOf(list), 480);
    await expect.poll(() => rememberedSize(page, 'inbox.list')).toBe('480');
    expect(await widthOf(page.getByTestId('window-sidebar'))).toBe(sidebarWidth);

    // act
    await dragDivider(page, divider, listX + 100);

    // assert: never narrower than 300 px.
    expectSize(await widthOf(list), 300);
    await expect(page.getByTestId('inbox-filter')).toBeVisible();
    await expectChromeInPlace(page);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

test('keeps the window chrome in place while a pane scrolls or a selection is dragged past it', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launch('scrolling');

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    const route = page.getByTestId('presenter-route-scroll');
    const statusBar = page.getByTestId('window-status-bar');
    await expect(page.getByTestId('home-view')).toBeVisible();
    // Overview is taller than the window, so its screen scrolls between toolbar and status bar.
    const routeBox = (await route.boundingBox())!;
    expect(routeBox.y).toBe(52);
    expect(routeBox.y + routeBox.height).toBeLessThanOrEqual((await statusBar.boundingBox())!.y);
    expect(await route.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
    await expectChromeInPlace(page);

    // act
    await page.mouse.move(routeBox.x + routeBox.width / 2, routeBox.y + routeBox.height / 2);
    await page.mouse.wheel(0, 800);

    // assert: only the screen scrolled.
    await expect.poll(() => route.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expectChromeInPlace(page);

    // act: a text selection dragged from the screen past its top, bottom and side edges.
    await route.evaluate((element) => element.scrollTo({ top: 0 }));
    const greeting = (await page.getByTestId('home-greeting').boundingBox()) ?? routeBox;
    await page.mouse.move(greeting.x + 4, greeting.y + greeting.height / 2);
    await page.mouse.down();
    await page.mouse.move(routeBox.x + 40, 690, { steps: 10 });
    await page.mouse.move(routeBox.x + 40, 4, { steps: 10 });
    await page.mouse.move(4, 300, { steps: 10 });
    await page.mouse.move(1036, 696, { steps: 10 });
    await page.mouse.up();

    // assert
    await expectChromeInPlace(page);
    await page.screenshot({ path: resolve(outputDirectory, 'resizable-panes-selection.png') });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

test('scrolls only the Inbox entries below their fixed filter and leaves the detail pane alone', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launch('inbox-scroll', {
    SYMPHONY_SIMULATED_ADDITIONAL_WORK_ITEMS: '12',
  });

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    expect(await seedInboxEntries(page, resolve('.'))).toBeGreaterThan(10);
    await page.getByTestId('navigation-inbox').click();
    const entries = page.locator('[test-id^="inbox-entry-"]');
    await expect(entries).not.toHaveCount(0, { timeout: 20_000 });
    await entries.first().click();
    await expect(page.getByTestId('inbox-detail')).toBeVisible();
    const list = page.getByTestId('inbox-list');
    const filter = page.getByTestId('inbox-filter');
    const lastEntry = entries.last();
    // The list pane ends above the status bar, and its entries continue below its edge.
    const listBox = (await list.boundingBox())!;
    expect(listBox.y + listBox.height).toBeLessThanOrEqual(
      (await page.getByTestId('window-status-bar').boundingBox())!.y,
    );
    const lastBefore = (await lastEntry.boundingBox())!;
    expect(lastBefore.y + lastBefore.height).toBeGreaterThan(listBox.y + listBox.height);
    const filterBefore = await filter.boundingBox();
    const detailScrollTop = () =>
      page
        .getByTestId('inbox-detail')
        .evaluate((detail) => detail.parentElement?.scrollTop ?? Number.NaN);

    // act
    const firstBox = (await entries.first().boundingBox())!;
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.wheel(0, 600);

    // assert: the entries moved, the filter row and the detail pane did not.
    await expect
      .poll(async () => (await lastEntry.boundingBox())?.y ?? Number.NaN)
      .toBeLessThan(lastBefore.y);
    expect(await filter.boundingBox()).toEqual(filterBefore);
    expect(await detailScrollTop()).toBe(0);
    await expectChromeInPlace(page);
    await page.screenshot({ path: resolve(outputDirectory, 'resizable-panes-inbox-scroll.png') });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
