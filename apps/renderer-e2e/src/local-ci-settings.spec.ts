// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettingsWindow } from './openSettingsWindow';

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
    await expect(page.getByTestId('navigation-settings')).toBeVisible();
    const settings = await openSettingsWindow(app, page);
    settings.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await settings.getByTestId('workspace-navigation-item-personal').click();
    await settings.getByTestId('workspace-settings-section-administration').click();
    // Workspace Administration keeps its own storage bar and limit.
    await expect(settings.getByTestId('workspace-storage-personal')).toBeVisible();
    await expect(settings.getByTestId('workspace-storage-size-personal')).not.toContainText(
      'Measuring',
    );
    await expect(settings.getByTestId('workspace-storage-limit-personal')).toHaveJSProperty(
      'value',
      20,
    );
    await expect(settings.getByTestId('workspace-storage-progress-personal-legend')).toContainText(
      'Available',
    );
    // Local GitHub Actions belong to a workspace: activation, guest image, and what each
    // repository provisions inside the guest are configured with the workspace itself.
    await settings.getByTestId('workspace-settings-section-local-ci').click();
    const workspaceCard = settings.getByTestId('workspace-local-ci-card');
    await expect(workspaceCard).toBeVisible();
    await expect(settings.getByTestId('settings-title')).toContainText('Local GitHub Actions');
    await expect(settings.getByTestId('local-ci-activation-settings-group')).toContainText(
      'Enable local runs',
    );
    await expect(settings.getByTestId('local-ci-image-settings-group')).toBeVisible();
    await expect(workspaceCard).toContainText('Guest image');
    await expect(settings.getByTestId('local-ci-setup-script-group')).toBeVisible();
    await expect(workspaceCard).toContainText('Repository setup');
    await expect(settings.getByTestId('workspace-local-ci-enabled-personal')).toHaveJSProperty(
      'isChecked',
      false,
    );
    await expect(settings.getByTestId('save-workspace-local-ci')).toHaveCount(0);

    // The machine those runs boot is host-owned: it lives under System, this Mac, beside the
    // single storage picture.
    await settings.getByTestId('global-settings-section-system').click();
    const card = settings.getByTestId('virtual-machines-card');
    await expect(card).toBeVisible();
    await expect(settings.getByTestId('storage-safety-card')).toBeVisible();
    await expect(settings.getByTestId('global-storage-size')).not.toContainText('Measuring');
    // The managed total is never one opaque block: every occupied share names itself in the
    // legend, and the unused remainder is named as well.
    const globalLegend = settings.getByTestId('global-storage-progress-legend');
    await expect(globalLegend).toBeVisible();
    await expect(
      settings.getByTestId('global-storage-progress-legend-application-state'),
    ).toBeVisible();
    await expect(globalLegend).toContainText('Available');
    await expect(card).toContainText('Virtual machines');
    // The guest contents are configuration and are not offered here: the machine card owns the
    // specification, not what a workspace runs inside it.
    await expect(settings.getByTestId('local-ci-image-settings-group')).toHaveCount(0);
    await expect(settings.getByTestId('local-ci-setup-script-group')).toHaveCount(0);
    await expect(settings.getByTestId('local-ci-reuse-vm')).toHaveJSProperty('isChecked', false);
    // The runner data path is shown, not edited: it always lives in the configuration root.
    await expect(settings.getByTestId('local-ci-runtime-root')).toContainText(
      resolve(configurationRoot, 'workspaces', 'local-ci'),
    );
    // The Local GitHub Actions share and its limit sit in the single storage picture.
    await expect(settings.getByTestId('local-ci-storage-share')).toContainText('of 32 GB');
    await expect(settings.getByTestId('local-ci-storage-limit')).toHaveJSProperty('value', 32);
    await expect(settings.getByTestId('local-ci-host-capacity')).toContainText('logical CPUs');

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

    await settings.getByTestId('local-ci-resource-preset').click();
    const compactPreset = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: ILocalCiOrchestrationApi }).orchestration;
      return (await api.request('storage.status.get', {})).localCiCapacity.presets.compact;
    });
    expect(compactPreset.supported).toBe(true);
    await settings.getByTestId('local-ci-resource-compact').click();
    await expect(settings.getByTestId('local-ci-resource-summary')).toContainText(
      `${compactPreset.resources.cpus} CPUs · ${compactPreset.resources.memoryGiB} GB memory · ${compactPreset.resources.diskGiB} GB maximum virtual disk`,
    );
    await settings.getByTestId('local-ci-resource-preset').click();
    await settings.getByTestId('local-ci-resource-custom').click();
    await expect(settings.getByTestId('local-ci-custom-resources')).toBeVisible();
    await expect(settings.getByTestId('local-ci-resource-cpus')).toHaveJSProperty(
      'value',
      compactPreset.resources.cpus,
    );
    await expect(settings.getByTestId('local-ci-resource-memory')).toHaveJSProperty(
      'value',
      compactPreset.resources.memoryGiB,
    );
    await expect(settings.getByTestId('local-ci-resource-cache')).toHaveJSProperty(
      'value',
      compactPreset.resources.cacheGiB,
    );
    const diskSlider = settings.getByTestId('local-ci-resource-disk');
    const diskSliderInput = diskSlider.getByRole('slider');
    // A slider value applies when it is released: the held arrow key steps the disk from the
    // compact preset to 24 GB and commits once on release.
    const initialDiskGiB = await diskSlider.evaluate(
      (element) => (element as HTMLElement & { value: number }).value,
    );
    const step = initialDiskGiB <= 24 ? 'ArrowRight' : 'ArrowLeft';
    await diskSliderInput.focus();
    for (let diskGiB = initialDiskGiB; diskGiB !== 24; diskGiB += step === 'ArrowRight' ? 1 : -1) {
      await settings.keyboard.down(step);
    }
    await settings.keyboard.up(step);
    await expect(diskSlider).toHaveJSProperty('value', 24);
    await expect(settings.getByTestId('local-ci-resource-preset')).toHaveJSProperty(
      'value',
      'custom',
    );
    await expect(settings.getByTestId('local-ci-resource-summary')).toContainText(
      `${compactPreset.resources.cpus} CPUs · ${compactPreset.resources.memoryGiB} GB memory · 24 GB maximum virtual disk · ${compactPreset.resources.cacheGiB} GB shared cache`,
    );
    // The machine settings apply as they change; there is no Save button.
    await expect(settings.getByTestId('save-local-ci-settings')).toHaveCount(0);
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
    // Enabling the workspace is what actually opens the capability; it applies at once.
    await settings.getByTestId('workspace-navigation-item-personal').click();
    await settings.getByTestId('workspace-settings-section-local-ci').click();
    await settings.getByTestId('workspace-local-ci-enabled-personal').click();
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Settings saved',
    );
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
    await settings.screenshot({
      path: resolve(outputDirectory, 'local-ci-settings.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
