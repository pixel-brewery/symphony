// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { BrowserWindow } from 'electron';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('flies saved project pilots without changing work, respects reduced motion, and hides the native window', async () => {
  // arrange
  const root = resolve('output/playwright/orbit-flybys');
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
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    const profiles = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const base = settings.agentProfiles[0]!;
      const profiles = (['blue', 'rose', 'coral', 'gold', 'violet'] as const).map(
        (color, index) => ({
          ...base,
          id: index === 0 ? base.id : `shuttle-pilot-${index}`,
          displayName: [
            'Paul Planung',
            'Paula Planung',
            'Arno Architektur',
            'Immo Implementierung',
            'Quirin Qualität',
          ][index]!,
          enabled: true,
          appearance: { figure: 'dot' as const, color, accessories: [] },
        }),
      );
      await api.request('settings.save', {
        settings: {
          ...settings,
          user: { ...settings.user, theme: 'system' },
          agentProfiles: [...profiles, { ...base, id: 'disabled-pilot', enabled: false }],
        },
      });
      await api.request('snapshot.refresh', {});
      return profiles;
    });
    await app.evaluate(
      ({ BrowserWindow }, url) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === url)
          ?.reload(),
      page.url(),
    );
    const canvas = page.getByTestId('orbit-canvas');
    const flights = page.getByTestId(/^orbit-flyby-shuttle-/u);
    await expect(canvas).toHaveAttribute('data-crew-count', '5');
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    const before = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return {
        settings: JSON.stringify(await api.request('settings.get', {})),
        executions: (await api.request('snapshot.get', {})).executions,
      };
    });
    // act
    if (process.env['SYMPHONY_E2E_WINDOW_MODE'] === 'hidden') {
      // Initially hidden Electron windows report a visible document. Keep this run reduced-motion;
      // the visible journey below verifies an actual show-to-hide visibility transition.
      await page.waitForTimeout(5200);
      await expect(canvas).toHaveAttribute('data-flight-count', '0');
      await expect(flights).toHaveCount(0);
      expect(errors).toEqual([]);
      return;
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => flights.count()).toBeGreaterThan(0);
    await expect
      .poll(async () =>
        flights.evaluateAll((labels) =>
          labels.some((label) => {
            const bounds = label.getBoundingClientRect();
            return (
              bounds.x > 200 &&
              bounds.right < window.innerWidth - 160 &&
              bounds.y > 250 &&
              bounds.bottom < window.innerHeight - 130
            );
          }),
        ),
      )
      .toBe(true);
    const passengers = await flights.evaluateAll((labels) =>
      labels.map((label) => {
        const bounds = label.getBoundingClientRect();
        return {
          id: label.getAttribute('data-agent-id'),
          source: label.getAttribute('data-figure-source'),
          testId: label.getAttribute('test-id'),
          inside:
            bounds.x > 200 &&
            bounds.right < window.innerWidth - 160 &&
            bounds.y > 250 &&
            bounds.bottom < window.innerHeight - 130,
        };
      }),
    );
    expect(passengers.length).toBeGreaterThan(0);
    expect(Number(await canvas.getAttribute('data-flight-count'))).toBeLessThanOrEqual(3);
    for (const passenger of passengers) {
      const pilot = profiles.find((profile) => profile.id === passenger.id)!;
      expect(pilot).toBeDefined();
      await expect(page.getByTestId(passenger.testId!)).toContainText(pilot.displayName);
      const character = {
        blue: 'blue',
        rose: 'rose',
        coral: 'orange',
        gold: 'gold',
        violet: 'purple',
      }[pilot.appearance.color];
      expect(passenger.source).toBe(`figures/${character}.png`);
    }
    await expect(canvas).toHaveAttribute('data-asset-state', 'ready');
    await page.screenshot({ path: resolve(root, 'rockets-wide-light.png'), fullPage: true });
    const rocket = page.getByTestId(passengers.find((passenger) => passenger.inside)!.testId!);
    const normalSize = Number(await rocket.getAttribute('data-projected-size'));
    await page.getByTestId('landscape-zoom-in').click();
    await page.getByTestId('landscape-zoom-in').click();
    await expect
      .poll(async () => Number(await rocket.getAttribute('data-projected-size')))
      .toBeGreaterThan(normalSize * 1.2);
    const closeSize = Number(await rocket.getAttribute('data-projected-size'));
    await page.screenshot({ path: resolve(root, 'rockets-close-light.png'), fullPage: true });
    await page.getByTestId('landscape-zoom-out').click();
    await page.getByTestId('landscape-zoom-out').click();
    await expect
      .poll(async () => Number(await rocket.getAttribute('data-projected-size')))
      .toBeLessThan(closeSize * 0.85);
    await page.getByTestId('landscape-fit').click();
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('theme-mode')))
      .toBe('dark');
    await expect.poll(() => flights.count()).toBeGreaterThan(0);
    await page.screenshot({ path: resolve(root, 'rockets-dark.png'), fullPage: true });
    await page.getByTestId('orbit-label-production').click();
    await expect(page.getByTestId('orbit-label-production')).toHaveAttribute(
      'data-selected',
      'true',
    );
    await expect(page.getByTestId('employee-details')).toHaveCount(0);
    await expect(canvas).toHaveAttribute('data-flight-count', '0', { timeout: 25000 });
    await expect(flights).toHaveCount(0);
    await expect.poll(() => flights.count(), { timeout: 35000 }).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(canvas).toHaveAttribute('data-flight-count', '0');
    await expect(flights).toHaveCount(0);
    await page.waitForTimeout(5200);
    await expect(flights).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => flights.count()).toBeGreaterThan(0);
    const mainWindow = await app.browserWindow(page);
    await mainWindow.evaluate((window: BrowserWindow) => window.hide());
    expect(await mainWindow.evaluate((window: BrowserWindow) => window.isVisible())).toBe(false);
    // assert
    const after = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return {
        settings: JSON.stringify(await api.request('settings.get', {})),
        executions: (await api.request('snapshot.get', {})).executions,
      };
    });
    expect(after).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
  }
});
