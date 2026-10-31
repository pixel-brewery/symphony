// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettingsWindow } from './openSettingsWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

interface ISkillCustomizationsApi {
  request(
    method: 'settings.get',
    payload: Record<string, never>,
  ): Promise<{ skillCustomizations: Array<{ role: string; additionalInstructions: string }> }>;
}

test('manages the delivery-flow skills in the Settings window instead of a main-window page', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `skills-settings-${process.pid}`);
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
    },
  });

  // assert
  try {
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    // Skills has no entry of its own in the main window any more.
    await expect(page.getByTestId('navigation-skills')).toHaveCount(0);

    const settings = await openSettingsWindow(app, page);
    settings.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await settings.getByTestId('global-settings-section-skills').click();
    await expect(settings.getByTestId('builtin-skills')).toBeVisible();

    // One block per delivery-flow step, in flow order, with its process roles.
    const steps = settings.locator('[test-id^="skill-step-"]:not([test-id^="skill-step-empty-"])');
    await expect(steps).toHaveCount(5);
    expect(
      await steps.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('test-id')),
      ),
    ).toEqual([
      'skill-step-create',
      'skill-step-plan',
      'skill-step-implement',
      'skill-step-fix-checks',
      'skill-step-address-reviews',
    ]);
    await expect(
      settings.getByTestId('skill-step-implement').getByTestId('builtin-skill-solve'),
    ).toContainText('Solve');
    await expect(
      settings.getByTestId('skill-step-implement').getByTestId('builtin-skill-verify'),
    ).toContainText('Verify');
    await expect(settings.getByTestId('builtin-skill-additions-analyze')).toContainText(
      'Built-in instructions only',
    );

    // The section's actions sit in the toolbar.
    const toolbar = settings.getByTestId('settings-toolbar-actions');
    for (const testId of [
      'refresh-skills',
      'open-skill-import',
      'open-skill-catalog',
      'new-skill',
    ]) {
      await expect(toolbar.getByTestId(testId)).toBeVisible();
    }

    // `Edit instructions` opens the role's sheet; `Save` stores the additions.
    await settings.getByTestId('builtin-skill-edit-analyze').click();
    const sheet = settings.getByTestId('builtin-skill-instructions-sheet-analyze');
    await expect(sheet).toBeVisible();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText(
      'Analyze · instructions',
    );
    await settings
      .getByTestId('builtin-skill-instructions-analyze')
      .locator('textarea')
      .fill('Always name the owning Nx project.');
    await settings.getByTestId('builtin-skill-save-analyze').click();
    await expect(sheet).toHaveCount(0);
    await expect
      .poll(() =>
        settings.evaluate(async () => {
          const api = (window as unknown as { orchestration: ISkillCustomizationsApi })
            .orchestration;
          return (await api.request('settings.get', {})).skillCustomizations;
        }),
      )
      .toEqual([{ role: 'analyze', additionalInstructions: 'Always name the owning Nx project.' }]);
    await expect(settings.getByTestId('builtin-skill-additions-analyze')).toContainText(
      'your additions: 1 line added',
    );

    // `Add skill` of a step opens the catalog sheet; Escape closes it.
    await settings.getByTestId('add-skill-plan').click();
    await expect(settings.getByTestId('skill-catalog-drawer')).toBeVisible();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText('Add skills');
    await settings.keyboard.press('Escape');
    await expect(settings.getByTestId('skill-catalog-drawer')).toHaveCount(0);

    // `Import skill` moved here from System.
    await toolbar.getByTestId('open-skill-import').click();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText('Import skill');
    await expect(settings.getByTestId('save-settings-editor')).toHaveJSProperty('disabled', true);
    await settings.getByTestId('cancel-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);

    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'skills-settings.png'),
      fullPage: true,
    });

    // The retired main-window route opens Settings at Skills instead.
    await page.evaluate(() => {
      window.location.hash = '/main/skills';
    });
    await expect(page).not.toHaveURL(/\/main\/skills/u);
    await expect(settings.getByTestId('settings-title-text')).toHaveJSProperty('text', 'Skills');
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
