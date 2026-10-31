// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { closeSettings } from './closeSettings';
import { expectSettingsInMainWindow } from './expectSettingsInMainWindow';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('keeps employee identities in workspace settings and follows the page Soho scheme in Orbit without losing the camera', async () => {
  // arrange
  const root = resolve('output/playwright/orbit-appearance');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const app = await electron.launch({
    args: ['.'],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: root,
      SYMPHONY_DATABASE_PATH: resolve(root, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(root, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(root, 'legacy'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });
  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: 'light' });
    const employees = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const base = settings.agentProfiles[0]!;
      const profiles = (['coral', 'mint', 'blue', 'violet', 'gold', 'rose'] as const).map(
        (color, index) => ({
          ...base,
          id: index === 0 ? base.id : `team-member-${index}`,
          displayName: `Team member ${index}`,
          appearance: { figure: 'dot' as const, color, accessories: [] },
        }),
      );
      await api.request('settings.save', {
        settings: {
          ...settings,
          user: { ...settings.user, theme: 'system' },
          agentProfiles: profiles,
        },
      });
      await api.request('snapshot.refresh', {});
      return profiles.map((profile) => ({
        id: profile.id,
        displayName: profile.displayName,
        workspaceId: profile.workspaceId,
        color: profile.appearance.color,
      }));
    });
    // act
    await app.evaluate(
      ({ BrowserWindow }, url) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === url)
          ?.reload(),
      page.url(),
    );
    // Symphony opens on Overview; Orbit is a Delivery entry in the sidebar.
    await page.getByTestId('navigation-orbit').click();
    const canvas = page.getByTestId('orbit-canvas');
    const webgl = page.getByTestId('orbit-webgl');
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    await expect(page.getByTestId('orbit-view').locator('symphony-agent-figure')).toHaveCount(0);
    await expect(page.getByTestId('orbit-label-group:team')).toHaveCount(0);
    await expect(page.getByTestId('employee-details')).toHaveCount(0);
    await page.screenshot({ path: resolve(root, 'orbit-without-employees.png'), fullPage: true });
    await page.getByTestId('global-workspace-filter').click();
    await expect(page.getByTestId('workspace-menu-stages')).toHaveCount(0);
    await expect(page.getByTestId('workspace-menu-employees')).toHaveCount(0);
    await page.getByTestId('global-workspace-filter').click();
    await page.evaluate(() => {
      location.hash = '/main/stages';
    });
    await expect(page).toHaveURL(/\/main\/board/u);
    await expect(page.getByTestId('board-view')).toBeVisible();
    await page.evaluate(() => {
      location.hash = '/main/team';
    });
    // The former Team route leads to Settings inside the main window.
    await expectSettingsInMainWindow(app, page);
    await closeSettings(page);
    await page.getByTestId('navigation-orbit').click();
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    await expect(page.getByTestId('employee-details')).toHaveCount(0);
    await expect(page.getByTestId('orbit-view').locator('symphony-agent-figure')).toHaveCount(0);
    // Work items are listed by stage cluster in the inspector; destinations in the toolbar menu.
    await expect(page.getByTestId('orbit-cluster-details')).toBeVisible();
    await expect(page.getByTestId('orbit-show-on-board')).toBeVisible();
    await page.getByTestId('orbit-label-production').click();
    const production = page.getByTestId('orbit-label-production');
    await expect(production).toHaveAttribute('data-selected', 'true');
    const camera = () =>
      canvas.evaluate((element) =>
        ['x', 'y', 'z', 'target-x', 'target-y', 'target-z']
          .map((coordinate) => element.getAttribute('data-camera-' + coordinate))
          .join(','),
      );
    const currentCamera = await camera();
    const originalCanvas = await webgl.elementHandle();
    const captureSun = async () => {
      await page.evaluate(
        () =>
          new Promise<void>((resolveFrame) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
          ),
      );
      const bounds = (await canvas.boundingBox())!;
      return app.evaluate(
        async ({ BrowserWindow }, input) => {
          const window = BrowserWindow.getAllWindows().find(
            (candidate) => candidate.webContents.getURL() === input.url,
          )!;
          const capture = await window.webContents.capturePage({
            x: Math.floor(input.x) - 2,
            y: Math.floor(input.y) - 2,
            width: 4,
            height: 4,
          });
          return Array.from(capture.toBitmap());
        },
        { url: page.url(), x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      );
    };
    const lightSun = await captureSun();
    for (const mode of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme: mode });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.getAttribute('theme-mode')))
        .toBe(mode);
      // The diagram sits on the neutral-50 canvas of the Orbit artboard.
      await expect(canvas).toHaveCSS(
        'background-color',
        mode === 'light' ? 'rgb(250, 250, 250)' : 'rgb(23, 23, 23)',
      );
      await expect(canvas).toHaveAttribute('data-render-state', 'ready');
      const sun = await captureSun();
      if (mode === 'light') expect(sun).toEqual(lightSun);
      else expect(sun).not.toEqual(lightSun);
      await expect(production).toHaveAttribute('data-selected', 'true');
      expect(await camera()).toBe(currentCamera);
      expect(
        await webgl.evaluate((element, previous) => element === previous, originalCanvas),
      ).toBe(true);
      const bounds = (await canvas.boundingBox())!;
      const pixel = await app.evaluate(
        async ({ BrowserWindow }, input) => {
          const window = BrowserWindow.getAllWindows().find(
            (candidate) => candidate.webContents.getURL() === input.url,
          )!;
          const capture = await window.webContents.capturePage({
            x: Math.ceil(input.x),
            y: Math.ceil(input.y),
            width: 1,
            height: 1,
          });
          return Array.from(capture.toBitmap().subarray(0, 4));
        },
        { url: page.url(), x: bounds.x + 2, y: bounds.y + 2 },
      );
      expect(pixel).toEqual(mode === 'light' ? [250, 250, 250, 255] : [23, 23, 23, 255]);
      await page.screenshot({ path: resolve(root, `soho-${mode}-selected.png`), fullPage: true });
    }
    const settings = await openSettings(page);
    await settings.getByTestId(`open-workspace-settings-${employees[0]!.workspaceId}`).click();
    await settings.getByTestId('workspace-settings-section-team').click();
    // Each AI team card draws the agent's own, still character figure in its colour beside the
    // agent's name.
    for (const employee of employees) {
      const figure = settings.getByTestId('agent-avatar-' + employee.id);
      const character =
        employee.color === 'coral'
          ? 'orange'
          : employee.color === 'violet'
            ? 'purple'
            : employee.color;
      await expect(settings.getByTestId('workspace-agent-' + employee.id)).toContainText(
        employee.displayName,
      );
      await figure.scrollIntoViewIfNeeded();
      await expect(figure.locator('[data-figure]')).toHaveAttribute('data-agent-id', employee.id);
      const image = figure.locator('[data-figure-image]');
      await expect(image).toHaveAttribute('src', `figures/${character}.png`);
      await expect
        .poll(() =>
          image.evaluate((element: HTMLImageElement) =>
            element.complete ? element.naturalWidth : 0,
          ),
        )
        .toBeGreaterThan(0);
    }
    await settings
      .getByTestId(`workspace-agents-${employees[0]!.workspaceId}`)
      .screenshot({ path: resolve(root, 'team-character-avatars.png') });
    // assert
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.getAttribute('theme'))).toBe('soho');
  } finally {
    await app.close();
  }
});
