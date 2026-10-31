// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

const PALETTE_SHORTCUT = process.platform === 'darwin' ? 'Meta+K' : 'Control+K';

test('opens the command palette with ⌘K, moves with the arrows, opens with Enter and closes with Esc', async () => {
  // arrange
  const configurationRoot = resolve(
    'output/playwright',
    `command-palette-configuration-${process.pid}`,
  );
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

  try {
    const page = await prepareMainWindow(app);
    const palette = page.getByTestId('command-palette');
    const search = page.getByTestId('command-palette-search').locator('input');

    // act: ⌘K opens the palette on the commands, with the search field focused
    await page.keyboard.press(PALETTE_SHORTCUT);

    // assert
    await expect(palette).toBeVisible();
    await expect(search).toBeFocused();
    await expect(page.getByTestId('command-palette-group-commands')).toHaveText('COMMANDS');
    await expect(page.getByTestId('command-palette-option-command:new-work-item')).toBeVisible();
    await expect(page.getByTestId('command-palette-hint')).toHaveText('↑↓ to move · ↵ to open');

    // This fresh profile has no CI bindings and Arcade is off: its commands stay stable.
    const rows = palette.locator('[role="option"]');
    const commandIds = [
      'command:new-work-item',
      'command:sync-now',
      'command:settings',
      'navigation:home',
      'navigation:inbox',
      'navigation:board',
      'navigation:pull-requests',
      'navigation:actions',
      'navigation:orbit',
    ];
    await expect(rows).toHaveCount(commandIds.length);
    for (const id of commandIds) {
      await expect(page.getByTestId(`command-palette-option-${id}`)).toBeVisible();
    }
    const firstCommand = page.getByTestId('command-palette-option-command:new-work-item');
    await expect(firstCommand).toHaveAttribute('aria-selected', 'true');

    // act: the arrows move between commands and wrap at both ends
    await search.press('ArrowDown');
    await expect(firstCommand).toHaveAttribute('aria-selected', 'false');
    await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
    await search.press('ArrowUp');
    await expect(firstCommand).toHaveAttribute('aria-selected', 'true');
    await search.press('ArrowUp');
    await expect(rows.nth(commandIds.length - 1)).toHaveAttribute('aria-selected', 'true');
    await search.press('ArrowDown');
    await expect(firstCommand).toHaveAttribute('aria-selected', 'true');

    // act: typing finds the work item and resets the selection
    await search.pressSequentially('execution diagnostics');
    const workItem = page.getByTestId('command-palette-option-work-item:work-item-138');

    // assert
    await expect(rows).toHaveCount(1);
    await expect(page.getByTestId('command-palette-group-work-items')).toHaveText('WORK ITEMS');
    await expect(workItem).toHaveAttribute('aria-selected', 'true');
    await expect(workItem).toContainText('#138 · Expose execution diagnostics');

    // act: Esc closes without opening anything
    await search.press('Escape');

    // assert
    await expect(palette).toBeHidden();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // act: text nothing matches shows the no-results state
    await page.keyboard.press(PALETTE_SHORTCUT);
    await expect(search).toBeFocused();
    await search.pressSequentially('zz-nothing-matches-zz');

    // assert
    await expect(page.getByTestId('command-palette-no-results')).toBeVisible();
    await expect(rows).toHaveCount(0);

    await search.press('Escape');
    await expect(palette).toBeHidden();

    // act: the toolbar search field opens the palette, and a destination command navigates
    await page.getByTestId('global-search-launcher').click();
    await expect(palette).toBeVisible();
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
    await search.pressSequentially('pull requests');
    await expect(page.getByTestId('command-palette-option-navigation:pull-requests')).toBeVisible();
    await page.getByTestId('command-palette-option-navigation:pull-requests').click();

    // assert
    await expect(palette).toBeHidden();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();
    await expect(page).toHaveURL(/#\/main\/pull-requests$/u);

    // act: ⌘K toggles the open palette closed again
    await page.keyboard.press(PALETTE_SHORTCUT);
    await expect(palette).toBeVisible();
    await page.keyboard.press(PALETTE_SHORTCUT);

    // assert
    await expect(palette).toBeHidden();

    // act: Enter opens the selected work item on the board
    await page.keyboard.press(PALETTE_SHORTCUT);
    await expect(search).toBeFocused();
    await search.pressSequentially('#138');
    await expect(workItem).toHaveAttribute('aria-selected', 'true');
    await search.press('Enter');

    // assert
    await expect(palette).toBeHidden();
    // The board's `item` link opens the work item; the board may forward it to the item's screen.
    await expect(page).toHaveURL(/#\/main\/board(?:\/work-item-138|\?item=work-item-138)/u);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
