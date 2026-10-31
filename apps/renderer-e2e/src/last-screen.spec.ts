// #region Imports

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { closeSettings } from './closeSettings';
import { launchArcadeApp } from './launchArcadeApp';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

/** Waits for the restarted main window and returns it without assuming the start screen. */
async function reopenedWindow(app: ElectronApplication): Promise<Page> {
  const page = await app.firstWindow();
  await expect(page.getByTestId('presenter-content')).toBeVisible({ timeout: 30_000 });
  return page;
}

test('reopens the last screen after a restart and never Settings', async () => {
  // arrange
  const first = await launchArcadeApp('last-screen');
  try {
    const page = await prepareMainWindow(first.app);
    await page.getByTestId('navigation-pull-requests').click();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();

    // act: quit while Settings is open on a nested section.
    await openSettings(page);
    await page.getByTestId('global-settings-section-system').click();
    await expect(page).toHaveURL(/#\/main\/settings/u);
  } finally {
    await first.app.close();
  }
  const second = await launchArcadeApp('last-screen', false);
  let reopenedOnPullRequests: string;
  try {
    const page = await reopenedWindow(second.app);

    // assert: the screen before Settings opens, with its destinations in the sidebar.
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();
    await expect(page.getByTestId('window-sidebar-override')).toHaveCount(0);
    reopenedOnPullRequests = page.url();

    // act: leave Settings with Back, then end on the Inbox.
    await openSettings(page);
    await closeSettings(page);
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();
    await page.getByTestId('navigation-inbox').click();
    await expect(page.getByTestId('inbox-view')).toBeVisible();
  } finally {
    await second.app.close();
  }
  const third = await launchArcadeApp('last-screen', false);
  try {
    const page = await reopenedWindow(third.app);

    // assert
    expect(reopenedOnPullRequests).toMatch(/#\/main\/pull-requests$/u);
    await expect(page.getByTestId('inbox-view')).toBeVisible();
    await expect(page).toHaveURL(/#\/main\/inbox$/u);
  } finally {
    await third.app.close();
  }
});
