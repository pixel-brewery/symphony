// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';

// #endregion

interface ILocalCiOrchestrationApi {
  request(method: 'ci.local.run', payload: { runId: string }): Promise<unknown>;
  request(
    method: 'settings.get',
    payload: Record<string, never>,
  ): Promise<{
    workspaces: readonly { id: string; localCiEnabled: boolean }[];
    localCi: {
      reuseVirtualMachine: boolean;
      resourcePreset: string;
      customResources?: { cpus: number; memoryGiB: number; diskGiB: number; cacheGiB: number };
      storageLimitGiB: number;
    };
  }>;
  request(
    method: 'storage.status.get',
    payload: Record<string, never>,
  ): Promise<{
    localCiCapacity: {
      presets: {
        compact: {
          supported: boolean;
          resources: { cpus: number; memoryGiB: number; diskGiB: number; cacheGiB: number };
        };
      };
    };
  }>;
}

test('configures bounded managed local CI before exposing the backend capability', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `local-ci-settings-${process.pid}`);
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
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await page.getByTestId('workspace-settings-section-administration').click();
    await expect(page.getByTestId('workspace-storage-personal')).toBeVisible();
    await expect(page.getByTestId('workspace-storage-size-personal')).not.toContainText(
      'Measuring',
    );
    await expect(page.getByTestId('workspace-storage-limit-personal')).toHaveJSProperty(
      'value',
      20,
    );
    await expect(page.getByTestId('workspace-storage-progress-personal-legend')).toContainText(
      'Available',
    );
    // Local GitHub Actions belong to a workspace: activation, guest image, and what each
    // repository provisions inside the guest are configured with the workspace itself.
    await page.getByTestId('workspace-settings-section-local-ci').click();
    const workspaceCard = page.getByTestId('workspace-local-ci-card');
    await expect(workspaceCard).toBeVisible();
    await expect(workspaceCard).toContainText('Local GitHub Actions');
    await expect(page.getByTestId('local-ci-image-settings-group')).toBeVisible();
    await expect(workspaceCard).toContainText('Guest image');
    await expect(page.getByTestId('local-ci-setup-script-group')).toBeVisible();
    await expect(workspaceCard).toContainText('Repository setup');
    await expect(page.getByTestId('workspace-local-ci-enabled-personal')).toHaveJSProperty(
      'isChecked',
      false,
    );
    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('global-settings-section-automation').click();

    // The machine those runs boot is host-owned and stays on its own card.
    const card = page.getByTestId('virtual-machines-card');
    await expect(card).toBeVisible();
    await page.getByTestId('global-settings-section-system').click();
    await expect(page.getByTestId('storage-safety-card')).toBeVisible();
    await expect(page.getByTestId('global-storage-size')).not.toContainText('Measuring');
    // The managed total is never one opaque block: every occupied share names itself in the
    // legend, and the unused remainder is named as well.
    const globalLegend = page.getByTestId('global-storage-progress-legend');
    await expect(globalLegend).toBeVisible();
    await expect(
      page.getByTestId('global-storage-progress-legend-application-state'),
    ).toBeVisible();
    await expect(globalLegend).toContainText('Available');
    await page.getByTestId('global-settings-section-automation').click();
    await expect(card).toContainText('Virtual machines');
    // The guest contents are configuration and are not offered here: the machine card owns the
    // specification, not what a workspace runs inside it.
    await expect(page.getByTestId('local-ci-image-settings-group')).toHaveCount(0);
    await expect(page.getByTestId('local-ci-setup-script-group')).toHaveCount(0);
    await expect(page.getByTestId('local-ci-reuse-vm')).toHaveJSProperty('isChecked', false);
    await expect(
      page.getByTestId('local-ci-runtime-root').getByRole('textbox', { name: 'Runner data' }),
    ).toHaveValue(resolve(configurationRoot, 'workspaces', 'local-ci'));
    await expect(page.getByTestId('local-ci-storage-size')).not.toContainText('Measuring');
    await expect(page.getByTestId('local-ci-storage-limit')).toHaveJSProperty('value', 32);
    await expect(page.getByTestId('local-ci-storage-progress-legend')).toContainText('Available');
    await expect(page.getByTestId('local-ci-host-capacity')).toContainText('logical CPUs');

    const localRunError = async (): Promise<string> =>
      page.evaluate(async () => {
        const api = (window as unknown as { orchestration: ILocalCiOrchestrationApi })
          .orchestration;
        try {
          await api.request('ci.local.run', { runId: 'unconfigured-run' });
          return '';
        } catch (cause) {
          return cause instanceof Error ? cause.message : String(cause);
        }
      });
    await expect(localRunError()).resolves.toContain('Enable local GitHub Actions');

    await page.getByTestId('local-ci-resource-preset').click();
    const compactPreset = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: ILocalCiOrchestrationApi }).orchestration;
      return (await api.request('storage.status.get', {})).localCiCapacity.presets.compact;
    });
    expect(compactPreset.supported).toBe(true);
    await page.getByTestId('local-ci-resource-compact').click();
    await expect(page.getByTestId('local-ci-resource-summary')).toContainText(
      `${compactPreset.resources.cpus} CPUs · ${compactPreset.resources.memoryGiB} GB memory · ${compactPreset.resources.diskGiB} GB maximum virtual disk`,
    );
    await page.getByTestId('local-ci-resource-preset').click();
    await page.getByTestId('local-ci-resource-custom').click();
    await expect(page.getByTestId('local-ci-custom-resources')).toBeVisible();
    await expect(page.getByTestId('local-ci-resource-cpus')).toHaveJSProperty(
      'value',
      compactPreset.resources.cpus,
    );
    await expect(page.getByTestId('local-ci-resource-memory')).toHaveJSProperty(
      'value',
      compactPreset.resources.memoryGiB,
    );
    await expect(page.getByTestId('local-ci-resource-cache')).toHaveJSProperty(
      'value',
      compactPreset.resources.cacheGiB,
    );
    const diskSlider = page.getByTestId('local-ci-resource-disk');
    const diskSliderInput = diskSlider.getByRole('slider');
    await diskSliderInput.focus();
    await diskSliderInput.press('Home');
    for (let diskGiB = 8; diskGiB < 24; diskGiB += 1) {
      await diskSliderInput.press('ArrowRight');
    }
    await expect(diskSlider).toHaveJSProperty('value', 24);
    await expect(page.getByTestId('local-ci-resource-preset')).toHaveJSProperty('value', 'custom');
    await expect(page.getByTestId('local-ci-resource-summary')).toContainText(
      `${compactPreset.resources.cpus} CPUs · ${compactPreset.resources.memoryGiB} GB memory · 24 GB maximum virtual disk · ${compactPreset.resources.cacheGiB} GB shared cache`,
    );
    await page.getByTestId('save-local-ci-settings').click();
    await expect(page.getByTestId('notification-success').last()).toContainText('Settings saved');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: ILocalCiOrchestrationApi })
            .orchestration;
          return (await api.request('settings.get', {})).localCi;
        }),
      )
      .toEqual({
        resourcePreset: 'custom',
        customResources: {
          cpus: compactPreset.resources.cpus,
          memoryGiB: compactPreset.resources.memoryGiB,
          diskGiB: 24,
          cacheGiB: compactPreset.resources.cacheGiB,
        },
        storageLimitGiB: 32,
        // A warm machine is opt-in: a fresh installation always recreates it.
        reuseVirtualMachine: false,
      });
    // Enabling the workspace is what actually opens the capability.
    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await page.getByTestId('workspace-settings-section-local-ci').click();
    await page.getByTestId('workspace-local-ci-enabled-personal').click();
    await page.getByTestId('save-workspace-local-ci').click();
    await expect(page.getByTestId('notification-success').last()).toContainText('Settings saved');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: ILocalCiOrchestrationApi })
            .orchestration;
          return (await api.request('settings.get', {})).workspaces.map(
            (workspace) => workspace.localCiEnabled,
          );
        }),
      )
      .toEqual([true]);
    await expect(localRunError()).resolves.not.toContain('Enable local GitHub Actions');
    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('global-settings-section-automation').click();
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(outputDirectory, 'local-ci-settings.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
