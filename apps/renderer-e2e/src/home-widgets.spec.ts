// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('home widgets mirror the board columns and land on the filtered board', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `home-widgets-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: workspace,
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
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '1500',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    const startupSplash = page.getByTestId('startup-splash');
    // Hydration may finish before Electron exposes the window to the test.
    await expect(startupSplash).toHaveCount(0);
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // One widget per board column; no attention widget while nothing has failed.
    await expect(page.getByTestId('home-column-widgets')).toBeVisible();
    await expect(page.getByTestId('home-column-widget-backlog')).toContainText('Backlog');
    await expect(page.getByTestId('home-column-widget-qualified')).toContainText('Qualified');
    await expect(page.getByTestId('home-column-widget-qualified')).toContainText('1');
    await expect(page.getByTestId('home-column-widget-done')).toContainText('Done');
    await expect(page.getByTestId('home-attention-widget')).toHaveCount(0);

    // Three categories stand side by side in one horizontal panorama. The full-width page lets
    // the band avoid scrolling when it fits; Mosaik Scroll owns overflow only when it is needed.
    await expect(page.getByTestId('home-category-board')).toBeVisible();
    await expect(page.getByTestId('home-category-pull-requests')).toContainText('Pull requests');
    await expect(page.getByTestId('home-category-actions')).toContainText('Actions');
    await expect(page.getByTestId('home-category-pull-requests-empty')).toBeVisible();
    await expect(page.getByTestId('home-category-actions-empty')).toBeVisible();
    await expect(page.getByTestId('home-category-pull-requests-slot-0-empty')).toBeVisible();
    await expect(page.getByTestId('home-category-pull-requests-slot-4-empty')).toBeVisible();
    await expect(page.getByTestId('home-category-pull-requests-slot-5-empty')).toHaveCount(0);
    await expect(page.getByTestId('home-panorama')).toBeVisible();
    await page.getByTestId('home-column-widget-backlog').evaluate(async (tile) => {
      await Promise.allSettled(tile.getAnimations().map((animation) => animation.finished));
    });

    // The Quick Play mosaic keeps square small cells and double-size cells in a fixed six-by-four
    // footprint instead of allowing the number of available projections to resize the category.
    const mosaic = await page.evaluate(() => {
      const track = document.querySelector('[test-id="home-column-widgets"]');
      const trackStyle = track ? getComputedStyle(track) : undefined;
      const tileElements = [...(track?.querySelectorAll('a[test-id]') ?? [])];
      const tiles = tileElements
        .map((tile) => tile.getBoundingClientRect())
        .sort((left, right) => left.width - right.width);
      const small = tiles.at(0);
      const large = tiles.at(-1);
      return {
        columns: trackStyle?.gridTemplateColumns.split(' ').length ?? 0,
        rows: trackStyle?.gridTemplateRows.split(' ').length ?? 0,
        largeWidth: large?.width ?? 0,
        largeHeight: large?.height ?? 0,
        smallWidth: small?.width ?? 0,
        smallHeight: small?.height ?? 0,
        contentFits: tileElements.every((tile) => {
          const tileBounds = tile.getBoundingClientRect();
          const cardBody = tile
            .querySelector('mosaik-card')
            ?.shadowRoot?.querySelector('[part="content"]');
          const content = tile.querySelector('mosaik-card-content');
          if (
            !cardBody ||
            !content ||
            cardBody.scrollHeight > cardBody.clientHeight + 1 ||
            content.scrollHeight > content.clientHeight + 1
          )
            return false;
          return [...tile.querySelectorAll('strong, mosaik-text')].every((content) => {
            const contentBounds = content.getBoundingClientRect();
            return (
              contentBounds.left >= tileBounds.left - 1 &&
              contentBounds.right <= tileBounds.right + 1 &&
              contentBounds.top >= tileBounds.top - 1 &&
              contentBounds.bottom <= tileBounds.bottom + 1
            );
          });
        }),
      };
    });
    expect(mosaic.columns).toBe(6);
    expect(mosaic.rows).toBe(4);
    expect(mosaic.smallWidth).toBeCloseTo(mosaic.smallHeight, 0);
    expect(mosaic.largeWidth).toBeCloseTo(mosaic.largeHeight, 0);
    expect(mosaic.largeWidth).toBeGreaterThan(mosaic.smallWidth * 2);
    expect(mosaic.smallWidth).toBeGreaterThanOrEqual(144);
    expect(mosaic.contentFits).toBe(true);

    // The five-second refresh first animates the old content out, swaps only after that animation,
    // and then animates the replacement in. A hovered tile keeps its fixed slot throughout.
    const protectedTile = page.getByTestId('home-column-widget-backlog');
    await protectedTile.hover();
    const protectedPosition = await protectedTile.evaluate((tile) => {
      const slot = tile.parentElement;
      return `${slot?.style.gridColumn}:${slot?.style.gridRow}`;
    });
    const movablePositions = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[test-id="home-column-widgets"] a[test-id]')]
          .filter((tile) => tile.getAttribute('test-id') !== 'home-column-widget-backlog')
          .map((tile) => {
            const slot = tile.parentElement;
            return [
              tile.getAttribute('test-id'),
              `${slot?.style.gridColumn}:${slot?.style.gridRow}`,
            ];
          }),
      ),
    );

    const exitingTiles = page.locator(
      '[test-id="home-column-widgets"] a[data-home-tile-animation="exit"]',
    );
    await expect
      .poll(() => exitingTiles.count(), {
        timeout: 6_000,
        intervals: [25, 50, 50, 100],
      })
      .toBeGreaterThan(0);
    const exitAnimation = await exitingTiles.first().evaluate((tile) => {
      const animation = tile.getAnimations()[0];
      const effect = animation?.effect;
      const keyframes = effect instanceof KeyframeEffect ? effect.getKeyframes() : [];
      return {
        duration: Number(effect?.getTiming().duration ?? 0),
        finalOpacity: Number(keyframes.at(-1)?.opacity ?? 1),
      };
    });
    expect(exitAnimation.duration).toBe(600);
    expect(exitAnimation.finalOpacity).toBe(0);
    const positionsDuringExit = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[test-id="home-column-widgets"] a[test-id]')]
          .filter((tile) => tile.getAttribute('test-id') !== 'home-column-widget-backlog')
          .map((tile) => {
            const slot = tile.parentElement;
            return [
              tile.getAttribute('test-id'),
              `${slot?.style.gridColumn}:${slot?.style.gridRow}`,
            ];
          }),
      ),
    );
    expect(positionsDuringExit).toEqual(movablePositions);

    await expect(exitingTiles).toHaveCount(0);
    await expect
      .poll(async () =>
        JSON.stringify(
          await page.evaluate(() =>
            Object.fromEntries(
              [...document.querySelectorAll('[test-id="home-column-widgets"] a[test-id]')]
                .filter((tile) => tile.getAttribute('test-id') !== 'home-column-widget-backlog')
                .map((tile) => {
                  const slot = tile.parentElement;
                  return [
                    tile.getAttribute('test-id'),
                    `${slot?.style.gridColumn}:${slot?.style.gridRow}`,
                  ];
                }),
            ),
          ),
        ),
      )
      .not.toBe(JSON.stringify(movablePositions));
    expect(
      await protectedTile.evaluate((tile) => {
        const slot = tile.parentElement;
        return `${slot?.style.gridColumn}:${slot?.style.gridRow}`;
      }),
    ).toBe(protectedPosition);
    await page.getByTestId('home-column-widgets').evaluate(async (track) => {
      const animations = [...track.querySelectorAll('a[test-id]')].flatMap((tile) =>
        tile.getAnimations(),
      );
      await Promise.all(animations.map((animation) => animation.finished));
    });
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'home-mosaic.png'),
      fullPage: true,
    });

    // The category's New button raises the board's own authoring drawer, and the one-shot intent
    // does not stay in the URL where a reload would re-open the drawer.
    await page.getByTestId('home-create-work-item').click();
    await expect(page).toHaveURL(/\/main\/board(?!.*create)/);
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await page.getByTestId('task-drawer-header-close').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // A column widget lands on the board narrowed to exactly that column.
    await page.getByTestId('home-column-widget-qualified').click();
    await expect(page).toHaveURL(/\/main\/board\?column=qualified/);
    await expect(page.getByTestId('board-column-qualified')).toBeVisible();
    await expect(page.getByTestId('board-column-backlog')).toHaveCount(0);
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();
    await expect(page.getByTestId('board-item-work-item-142')).toHaveCount(0);

    // The consolidated toolbar filter names the narrowed column and clears back to the whole board.
    const filterMenu = page.getByTestId('board-filter');
    const columnFilter = page.getByTestId('board-column-filter');
    await filterMenu.click();
    await expect(columnFilter).toContainText('Qualified');
    await columnFilter.click();
    await page.getByTestId('board-column-filter-all').click();
    await expect(page.getByTestId('board-column-backlog')).toBeVisible();
    await expect(filterMenu).toHaveJSProperty('isDropDownOpen', false);

    // A failing run needs an assigned analysis skill and a repository binding that
    // resolves the simulated items' "example/platform"; both go through the typed API.
    await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const workspaceId = settings.workspaces[0]!.id;
      const analysisSkill = await api.request('skills.save', {
        skill: {
          name: 'home-widgets-analysis',
          description: 'Analysis skill for the home widget slice.',
          instructions: 'Analyze the selected work item and return an implementation-ready plan.',
          openaiYaml: '',
          files: [],
        },
      });
      const connection = {
        id: 'home-widgets-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Home widgets GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'home-widgets-repository',
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: 'example/platform',
        provider: 'github' as const,
        host: 'github.com',
        owner: 'example',
        name: 'platform',
        defaultBranch: 'main',
        localPath,
        enabled: true,
      };
      await api.request('settings.save', {
        settings: {
          ...settings,
          connections: [...settings.connections, connection],
          repositoryBindings: [...settings.repositoryBindings, repository],
          deliveryContexts: [
            {
              id: 'home-widgets-context',
              workspaceId,
              displayName: 'Home widgets',
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
    }, workspace);

    // The seeding went straight through the typed API, so the renderer store still holds the
    // settings it loaded at start-up; a reload is what puts the new binding in front of it.
    await app.evaluate(
      ({ BrowserWindow }, rendererUrl) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === rendererUrl)
          ?.reload(),
      page.url(),
    );
    await expect(page.getByTestId('board-view')).toBeVisible();

    // A bound GitHub repository is what enables the pull-request category's New button; it raises
    // the delivery feature's own drawer across the feature boundary.
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    const createPullRequest = page.getByTestId('home-create-pull-request');
    await expect(createPullRequest).toHaveJSProperty('disabled', false);
    await createPullRequest.click();
    await expect(page).toHaveURL(/\/main\/pull-requests(?!.*create)/);
    await expect(page.getByTestId('pull-request-create-drawer')).toBeVisible();
    await page.getByTestId('pull-request-create-header-close').click();
    await expect(page.getByTestId('pull-request-create-drawer')).toHaveCount(0);

    // The only analyzable item is #138 in Qualified; while its run is in flight the Qualified tile
    // must name the work in progress, and once the run settles the failure must surface as the
    // attention widget.
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    const failedExecutionId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const admission = await api.request('analyzer.start', { simulateFailure: true });
      if (admission.outcome !== 'started') throw new Error('The analysis was queued, not started.');
      return admission.execution.id;
    });
    await expect(page.getByTestId('home-column-widget-qualified-progress-count')).toContainText(
      '1 in progress',
    );
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'home-mosaic-in-progress.png'),
      fullPage: true,
    });
    await expect
      .poll(
        () =>
          page.evaluate(async (executionId) => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions.find((execution) => execution.id === executionId)?.state;
          }, failedExecutionId),
        { timeout: 20_000 },
      )
      .toBe('failed');

    // The runner let go, so the tile goes quiet again and the failure moves to the attention tile.
    await expect(page.getByTestId('home-column-widget-qualified-progress-count')).toHaveCount(0);
    await expect(page.getByTestId('home-attention-widget')).toBeVisible();
    await expect(page.getByTestId('home-attention-widget')).toContainText('1');

    // The attention widget lands on the board narrowed to the items whose newest run failed.
    await page.getByTestId('home-attention-widget').click();
    await expect(page).toHaveURL(/\/main\/board\?attention=true/);
    const attentionFilter = page.getByTestId('board-attention-filter-clear');
    await expect(attentionFilter).toBeVisible();
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();
    await expect(page.getByTestId('board-item-work-item-142')).toHaveCount(0);
    await attentionFilter.click();
    await expect(page.getByTestId('board-attention-filter-clear')).toHaveCount(0);
    await expect(page.getByTestId('board-item-work-item-142')).toBeVisible();

    // Larger readable tiles stay reachable at laptop heights and native zoom.
    await page.getByTestId('navigation-home').click();
    for (const size of [
      { width: 1040, height: 700, zoom: 1 },
      { width: 1040, height: 700, zoom: 1.25 },
      { width: 780, height: 620, zoom: 1 },
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, { rendererUrl, size }) => {
          const window = BrowserWindow.getAllWindows().find(
            (candidate) => candidate.webContents.getURL() === rendererUrl,
          );
          if (!window) throw new Error('The Overview window is missing.');
          window.setContentSize(size.width, size.height);
          window.webContents.setZoomFactor(size.zoom);
        },
        { rendererUrl: page.url(), size },
      );
      await expect
        .poll(() =>
          page.getByTestId('home-panorama').evaluate((panorama) => {
            const bounds = panorama.getBoundingClientRect();
            const container = panorama.closest('mosaik-page-content')!.getBoundingClientRect();
            return bounds.top >= container.top - 1 && bounds.bottom <= container.bottom + 1;
          }),
        )
        .toBe(true);
      const label = page.getByTestId('home-column-widget-done-label');
      await page.getByTestId('home-column-widget-done').scrollIntoViewIfNeeded();
      await expect(label).toBeInViewport({ ratio: 1 });
      await expect
        .poll(() =>
          label.evaluate((element) => {
            const text = element.shadowRoot?.querySelector('[part="text"]');
            const tile = element.closest('a')!;
            const bounds = tile.getBoundingClientRect();
            if (!text) return false;
            const range = document.createRange();
            range.selectNodeContents(text);
            return [...range.getClientRects()].every(
              (line) =>
                line.left >= bounds.left &&
                line.right <= bounds.right &&
                line.top >= bounds.top &&
                line.bottom <= bounds.bottom,
            );
          }),
        )
        .toBe(true);
      await page.getByTestId('home-category-actions-empty').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('home-category-actions-empty')).toBeInViewport({ ratio: 1 });
    }
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'home-readable-compact.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
