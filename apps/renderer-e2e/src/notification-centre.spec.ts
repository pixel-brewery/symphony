// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { expandBoardColumn } from './expandBoardColumn';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('opens the notification centre upwards from the status bar with problems, their fixes and today’s notices', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `notification-centre-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
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
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_ADDITIONAL_WORK_ITEMS: '12',
    },
  });

  // assert
  try {
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    const bell = page.getByTestId('notification-bell');
    const centre = page.getByTestId('notification-centre');

    // The default workspace's Codex account needs attention: its CLI or its sign-in is missing.
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('aria-label', /^Notifications, \d+ needs? attention$/u);
    await expect(page.getByTestId('notification-bell-count')).toBeVisible();

    // A toast the app shows is kept as today's notice.
    await page.getByTestId('navigation-board').click();
    await expandBoardColumn(page, 'qualified');
    await page.getByTestId('board-item-work-item-138').click({ button: 'right' });
    await page.getByTestId('board-item-action-analyze-work-item-138').click();
    await expect(page.getByTestId('notification-warning').last()).toContainText(
      'Choose one repository',
    );

    await bell.click();
    await expect(centre).toBeVisible();
    await expect(bell).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('notification-centre-count')).toContainText(
      /\d+ needs? attention · \S/u,
    );
    const attention = page.getByTestId('notification-centre-attention');
    await expect(attention).toContainText('Needs attention');
    await expect(attention).toContainText(/Codex/u);
    await expect(attention).toContainText(/(System › Developer tools|› Connected services)/u);
    await expect(attention.locator('[test-id^="notification-unread-"]').first()).toBeVisible();
    await expect(page.getByTestId('notification-centre-history')).toContainText(
      'Choose one repository',
    );
    await expect(page.getByTestId('notification-centre-footer')).toContainText(
      'Work-item decisions stay in the Inbox.',
    );

    // The popover opens upwards over the current view, ending above the status bar.
    const geometry = await page.evaluate(() => {
      const rect = (testId: string): DOMRect | undefined =>
        document.querySelector(`[test-id="${testId}"]`)?.getBoundingClientRect();
      return {
        centre: rect('notification-centre'),
        statusBar: rect('window-status-bar'),
        bell: rect('notification-bell'),
      };
    });
    expect(geometry.centre?.width).toBe(400);
    expect(geometry.centre?.bottom ?? 0).toBeLessThanOrEqual(geometry.statusBar?.top ?? 0);
    expect(
      Math.abs((geometry.centre?.right ?? 0) - (geometry.bell?.right ?? 0)),
    ).toBeLessThanOrEqual(8);
    await page.screenshot({ path: resolve(outputDirectory, 'notification-centre.png') });

    // Read marks clear the unread dots; problems stay until they are fixed.
    await page.getByTestId('notification-centre-mark-all-read').click();
    await expect(attention.locator('[test-id^="notification-unread-"]')).toHaveCount(0);
    await expect(page.getByTestId('notification-centre-mark-all-read')).toHaveAttribute(
      'disabled',
      '',
    );
    await expect(attention).toContainText(/Codex/u);
    await page.getByTestId('notification-centre-clear-read').click();
    await expect(page.getByTestId('notification-centre-history')).toHaveCount(0);

    // Escape closes the popover; the tray's `Notifications` row opens it through the URL.
    await page.keyboard.press('Escape');
    await expect(centre).toHaveCount(0);
    await page.evaluate(() => {
      window.location.hash = '/main/home?notifications=open';
    });
    await expect(centre).toBeVisible();
    await expect(page).toHaveURL(/#\/main\/home$/u);

    // A fix opens the place the problem lives or asks for the same confirmation as there.
    const fix = attention.locator('[test-id^="notification-action-"]').first();
    const fixLabel = await fix.evaluate((element) => (element as { label?: string }).label);
    if (fixLabel === 'Install with Homebrew') {
      await fix.click();
      const confirmation = page.locator('mosaik-message-box').last();
      await expect(confirmation).toContainText(/Install .+\?/u);
      await confirmation.getByText('Cancel', { exact: true }).click();
    } else {
      const settingsOpened = app.waitForEvent('window', { timeout: 30_000 });
      await fix.click();
      const settings = await settingsOpened;
      await expect.poll(() => settings.url()).toContain('#/settings');
    }
    await expect(centre).toHaveCount(0);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
