// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { NotificationService } from '@symphony/frontend-notification';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { StoragePressureNotificationSource } from './StoragePressureNotificationSource';

// #endregion

type StorageStatus = ResponsePayload<'storage.status.get'>;
type Pressure = StorageStatus['global']['pressure'];

const GIB = 1024 ** 3;

function usage(id: string, pressure: Pressure, workspaceId?: string) {
  const allocatedGiB =
    pressure === 'healthy' ? 20 : pressure === 'warning' ? 35 : pressure === 'danger' ? 45 : 49;
  return {
    id,
    label: id,
    ...(workspaceId ? { workspaceId } : {}),
    allocatedBytes: allocatedGiB * GIB,
    limitBytes: 50 * GIB,
    usagePercent: allocatedGiB * 2,
    pressure,
    segments: [],
  };
}

function storage(options: {
  managed?: Pressure;
  filesystem?: Pressure;
  workspace?: Pressure;
  writable?: boolean;
  measured?: boolean;
  admission?: StorageStatus['localCiAdmission'];
}): StorageStatus {
  const availableBytes =
    (options.filesystem === 'critical'
      ? 12
      : options.filesystem === 'danger'
        ? 24
        : options.filesystem === 'warning'
          ? 35
          : 64) * GIB;
  const reserveBytes = 20 * GIB;
  const preset = {
    resources: { cpus: 4, memoryGiB: 8, diskGiB: 16, cacheGiB: 8 },
    supported: true,
  };
  return {
    measuredAt: '2026-10-30T10:00:00.000Z',
    measured: options.measured ?? true,
    writable: options.writable ?? true,
    global: usage('global', options.managed ?? 'healthy'),
    localCi: usage('local-ci', 'healthy'),
    localCiAdmission: options.admission ?? {
      state: 'permitted',
      availableBytes,
      reserveBytes,
      requiredGrowthBytes: 8 * GIB,
      shortfallBytes: 0,
    },
    localCiCapacity: {
      logicalCpus: 8,
      totalMemoryBytes: 32 * GIB,
      availableStorageBytes: Math.max(0, availableBytes - reserveBytes),
      presets: { compact: preset, balanced: preset, performance: preset, custom: preset },
    },
    workspaces: [usage('personal', options.workspace ?? 'healthy', 'personal')],
    filesystem: {
      availableBytes,
      reserveBytes,
      pressure: options.filesystem ?? 'healthy',
    },
  };
}

function blockedAdmission(
  reason: Extract<
    StorageStatus['localCiAdmission'],
    { state: 'blocked' }
  >['reason'] = 'filesystem-reserve',
): Extract<StorageStatus['localCiAdmission'], { state: 'blocked' }> {
  return {
    state: 'blocked',
    reason,
    availableBytes: (reason === 'filesystem-reserve' ? 12 : 64) * GIB,
    reserveBytes: 20 * GIB,
    requiredGrowthBytes: 8 * GIB,
    shortfallBytes: (reason === 'filesystem-reserve' ? 16 : 0) * GIB,
    ...(reason === 'workspace-limit' ? { workspaceId: 'personal' } : {}),
  };
}

function arrange(status: StorageStatus | undefined, localCiEnabled = false) {
  const defaults = createDefaultApplicationSettings('/storage');
  const settings = applicationSettingsSchema.parse({
    ...defaults,
    workspaces: defaults.workspaces.map((workspace) => ({ ...workspace, localCiEnabled })),
  });
  const configuration = {
    settings: signal(settings),
    storageStatus: signal(status),
    refreshStorageStatus: vi.fn<ConfigurationStore['refreshStorageStatus']>(async () => undefined),
  };
  const desktop = { request: vi.fn(async () => ({ completed: true })) };
  const notifications = { showError: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      StoragePressureNotificationSource,
      { provide: ConfigurationStore, useValue: configuration },
      { provide: DESKTOP_CLIENT, useValue: desktop },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return {
    source: TestBed.inject(StoragePressureNotificationSource),
    configuration,
    desktop,
    notifications,
  };
}

describe('StoragePressureNotificationSource', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('reports nothing while storage is healthy or not measured', () => {
    // arrange
    const healthy = arrange(storage({})).source.items();
    TestBed.resetTestingModule();
    // act
    const unmeasured = arrange(undefined).source.items();
    // assert
    expect(healthy).toEqual([]);
    expect(unmeasured).toEqual([]);
  });

  it('reports each area under pressure with its size and where it is managed', () => {
    // arrange
    const { source } = arrange(
      storage({ managed: 'danger', filesystem: 'warning', workspace: 'critical' }),
    );
    // act
    const items = source.items();
    // assert
    expect(
      items.map(({ id, severity, title, location, detail }) => ({
        id,
        severity,
        title,
        location,
        detail,
      })),
    ).toEqual([
      {
        id: 'storage:managed',
        severity: 'warning',
        title: 'Managed storage is almost full',
        location: ['System', 'Storage'],
        detail: '45.0 GB of 50.0 GB in use',
      },
      {
        id: 'storage:filesystem',
        severity: 'warning',
        title: 'This Mac is low on free space',
        location: ['System', 'Storage'],
        detail: '35.0 GB free · Symphony keeps 20.0 GB free',
      },
      {
        id: 'storage:workspace:personal',
        severity: 'error',
        title: 'Personal has reached its storage limit',
        location: ['Personal', 'Administration'],
        detail: '49.0 GB of 50.0 GB in use',
      },
    ]);
  });

  it('reports blocked writes that no full area explains', () => {
    // arrange
    const { source } = arrange(storage({ writable: false }));
    // act
    const items = source.items();
    // assert
    expect(items.map((item) => [item.id, item.severity])).toEqual([['storage:blocked', 'error']]);
  });

  it('opens the storage picture in Settings and measures silently', async () => {
    // arrange
    const { source, desktop, configuration } = arrange(storage({ workspace: 'warning' }));
    // act
    await source.perform('storage:workspace:personal', 'review');
    await source.perform('storage:managed', 'review');
    await source.refresh();
    // assert
    expect(desktop.request.mock.calls).toEqual([
      ['settings.open', { parameters: { workspace: 'personal', section: 'administration' } }],
      ['settings.open', { parameters: { section: 'system' } }],
    ]);
    expect(configuration.refreshStorageStatus).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('shows live reserve refusal and all budget figures while allocation inventory is still pending', async () => {
    // arrange
    const { source, desktop } = arrange(
      storage({
        measured: false,
        filesystem: 'critical',
        writable: false,
        admission: blockedAdmission(),
      }),
      true,
    );

    // act
    const items = source.items();
    await source.perform('storage:local-ci', 'review');

    // assert
    expect(items.map((item) => item.id)).toEqual(['storage:filesystem', 'storage:local-ci']);
    expect(items.find((item) => item.id === 'storage:local-ci')).toMatchObject({
      severity: 'error',
      title: 'Local GitHub Actions needs more free space',
      detail:
        'Mac free: 12.0 GB · protected reserve: 20.0 GB · required growth: 8.0 GB · free-space shortfall: 16.0 GB',
      actions: [{ id: 'review', label: 'Review storage', emphasis: 'secondary' }],
    });
    expect(desktop.request).toHaveBeenCalledExactlyOnceWith('settings.open', {
      parameters: { section: 'system' },
    });
  });

  it.each([
    { reason: 'managed-limit', explanation: 'the managed storage limit' },
    { reason: 'local-ci-limit', explanation: 'its storage limit' },
    { reason: 'workspace-limit', explanation: 'a workspace storage limit' },
  ] as const)(
    'identifies $reason without describing a zero free-space shortfall as low disk space',
    async ({ reason, explanation }) => {
      // arrange
      const current = storage({
        managed: reason === 'managed-limit' ? 'critical' : 'healthy',
        workspace: reason === 'workspace-limit' ? 'critical' : 'healthy',
        admission: blockedAdmission(reason),
      });
      const { source, desktop } = arrange(
        {
          ...current,
          localCi: usage('local-ci', reason === 'local-ci-limit' ? 'critical' : 'healthy'),
        },
        true,
      );

      // act
      const item = source.items().find((candidate) => candidate.id === 'storage:local-ci');
      await source.perform('storage:local-ci', 'review');

      // assert
      expect(item?.severity).toBe('error');
      expect(item?.title).toContain(explanation);
      expect(item?.title).not.toContain('more free space');
      expect(item?.detail).toContain('Mac free: 64.0 GB');
      expect(item?.detail).toContain('protected reserve: 20.0 GB');
      expect(item?.detail).toContain('required growth: 8.0 GB');
      expect(item?.detail).toContain('free-space shortfall: 0 B');
      expect(desktop.request).toHaveBeenCalledExactlyOnceWith('settings.open', {
        parameters:
          reason === 'workspace-limit'
            ? { workspace: 'personal', section: 'administration' }
            : { section: 'system' },
      });
    },
  );

  it('does not label filesystem pressure as an exhausted managed quota or round a subcritical quota up to full', () => {
    // arrange
    const current = storage({ filesystem: 'critical', admission: blockedAdmission() });
    const { source, configuration } = arrange({
      ...current,
      global: { ...current.global, pressure: 'critical' },
    });

    // act
    const reserveItems = source.items();
    configuration.storageStatus.set({
      ...current,
      global: {
        ...current.global,
        allocatedBytes: Math.floor(47.4 * GIB),
        usagePercent: 95,
        pressure: 'critical',
      },
    });
    const quotaItem = source.items().find((item) => item.id === 'storage:managed');

    // assert
    expect(reserveItems.map((item) => item.id)).toEqual(['storage:filesystem']);
    expect(reserveItems[0]?.title).toBe('This Mac has reached its free-space reserve');
    expect(quotaItem?.title).toBe('Managed storage is almost full');
    expect(quotaItem?.severity).toBe('warning');
  });

  it('suppresses only the local-CI warning when every workspace has local CI off or is disabled', async () => {
    // arrange
    vi.useFakeTimers();
    const { source, configuration, notifications } = arrange(
      storage({ filesystem: 'critical', admission: blockedAdmission() }),
    );

    // act
    source.connect();
    await vi.advanceTimersByTimeAsync(0);
    configuration.settings.update((settings) => ({
      ...settings,
      workspaces: settings.workspaces.map((workspace) => ({
        ...workspace,
        enabled: false,
        localCiEnabled: true,
      })),
    }));
    TestBed.tick();

    // assert
    expect(source.items().map((item) => item.id)).toEqual(['storage:filesystem']);
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('toasts a connected blocked transition without opening the bell and ignores free-byte fluctuations', async () => {
    // arrange
    vi.useFakeTimers();
    const blocked = storage({ filesystem: 'critical', admission: blockedAdmission() });
    const { source, configuration, notifications } = arrange(blocked, true);

    // act
    source.connect();
    source.connect();
    await vi.advanceTimersByTimeAsync(0);
    configuration.storageStatus.set({
      ...blocked,
      localCiAdmission: {
        ...blockedAdmission(),
        availableBytes: 13 * GIB,
        shortfallBytes: 15 * GIB,
      },
      filesystem: { ...blocked.filesystem, availableBytes: 13 * GIB },
    });
    TestBed.tick();
    await source.refresh();

    // assert
    expect(notifications.showError).toHaveBeenCalledTimes(1);
    expect(notifications.showError).toHaveBeenCalledWith(
      'Local GitHub Actions needs more free space',
      expect.stringContaining('Review storage in Settings.'),
    );
    expect(source.items().find((item) => item.id === 'storage:local-ci')?.detail).toContain(
      'Mac free: 13.0 GB',
    );
  });

  it('clears recovered blockers and allows a new toast after recovery, a changed reason or re-enablement', async () => {
    // arrange
    vi.useFakeTimers();
    const blocked = storage({ filesystem: 'critical', admission: blockedAdmission() });
    const { source, configuration, notifications } = arrange(blocked, true);
    source.connect();
    await vi.advanceTimersByTimeAsync(0);

    // act
    configuration.storageStatus.set(storage({}));
    TestBed.tick();
    const recovered = source.items();
    configuration.storageStatus.set(blocked);
    TestBed.tick();
    configuration.storageStatus.set(
      storage({ managed: 'critical', admission: blockedAdmission('managed-limit') }),
    );
    TestBed.tick();
    configuration.settings.update((settings) => ({
      ...settings,
      runtime: {
        ...settings.runtime,
        managedStorageLimitGiB: settings.runtime.managedStorageLimitGiB - 1,
      },
    }));
    TestBed.tick();
    configuration.settings.update((settings) => ({
      ...settings,
      workspaces: settings.workspaces.map((workspace) => ({ ...workspace, localCiEnabled: false })),
    }));
    TestBed.tick();
    const disabled = source.items();
    configuration.settings.update((settings) => ({
      ...settings,
      workspaces: settings.workspaces.map((workspace) => ({ ...workspace, localCiEnabled: true })),
    }));
    TestBed.tick();

    // assert
    expect(recovered.some((item) => item.id === 'storage:local-ci')).toBe(false);
    expect(disabled.some((item) => item.id === 'storage:local-ci')).toBe(false);
    expect(notifications.showError.mock.calls.map(([title]) => title)).toEqual([
      'Local GitHub Actions needs more free space',
      'Local GitHub Actions needs more free space',
      'Local GitHub Actions is blocked by the managed storage limit',
      'Local GitHub Actions is blocked by the managed storage limit',
    ]);
  });

  it('updates a changing live growth estimate without repeating the same blocked-state toast', async () => {
    // arrange
    vi.useFakeTimers();
    const blocked = storage({ filesystem: 'critical', admission: blockedAdmission() });
    const { source, configuration, notifications } = arrange(blocked, true);
    source.connect();
    await vi.advanceTimersByTimeAsync(0);

    // act
    configuration.storageStatus.set({
      ...blocked,
      localCiAdmission: {
        ...blockedAdmission(),
        requiredGrowthBytes: 10 * GIB,
        shortfallBytes: 18 * GIB,
      },
    });
    TestBed.tick();

    // assert
    expect(notifications.showError).toHaveBeenCalledTimes(1);
    expect(source.items().find((item) => item.id === 'storage:local-ci')?.detail).toContain(
      'required growth: 10.0 GB · free-space shortfall: 18.0 GB',
    );
  });

  it('does not repeat an old block when saved preset, resource or quota settings arrive before refreshed admission', async () => {
    // arrange
    vi.useFakeTimers();
    const { source, configuration, notifications } = arrange(
      storage({ filesystem: 'critical', admission: blockedAdmission() }),
      true,
    );
    configuration.settings.update((settings) => ({
      ...settings,
      localCi: {
        ...settings.localCi,
        resourcePreset: 'compact',
        customResources: { cpus: 4, memoryGiB: 8, diskGiB: 16, cacheGiB: 8 },
      },
    }));
    source.connect();
    await vi.advanceTimersByTimeAsync(0);

    // act
    configuration.settings.update((settings) => ({
      ...settings,
      localCi: {
        ...settings.localCi,
        customResources: { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 8 },
      },
    }));
    TestBed.tick();
    const afterInactiveChange = notifications.showError.mock.calls.length;
    configuration.settings.update((settings) => ({
      ...settings,
      localCi: { ...settings.localCi, resourcePreset: 'custom' },
    }));
    TestBed.tick();
    configuration.settings.update((settings) => ({
      ...settings,
      localCi: {
        ...settings.localCi,
        customResources: { cpus: 4, memoryGiB: 8, diskGiB: 32, cacheGiB: 8 },
      },
    }));
    TestBed.tick();
    configuration.settings.update((settings) => ({
      ...settings,
      localCi: {
        ...settings.localCi,
        customResources: { cpus: 4, memoryGiB: 8, diskGiB: 32, cacheGiB: 16 },
      },
    }));
    TestBed.tick();
    configuration.settings.update((settings) => ({
      ...settings,
      runtime: { ...settings.runtime, managedStorageLimitGiB: 200 },
      localCi: { ...settings.localCi, storageLimitGiB: 100 },
      workspaces: settings.workspaces.map((workspace) => ({
        ...workspace,
        storageLimitGiB: 100,
      })),
    }));
    TestBed.tick();
    const afterSavedSettings = notifications.showError.mock.calls.length;
    configuration.storageStatus.set(storage({}));
    TestBed.tick();
    const recoveredItems = source.items();
    configuration.storageStatus.set(
      storage({ filesystem: 'critical', admission: blockedAdmission() }),
    );
    TestBed.tick();

    // assert
    expect(afterInactiveChange).toBe(1);
    expect(afterSavedSettings).toBe(1);
    expect(recoveredItems).toEqual([]);
    expect(notifications.showError).toHaveBeenCalledTimes(2);
  });

  it('does not fabricate a recovery or another toast when only allocation inventory becomes pending', async () => {
    // arrange
    vi.useFakeTimers();
    const blocked = storage({ filesystem: 'critical', admission: blockedAdmission() });
    const { source, configuration, notifications } = arrange(blocked, true);
    source.connect();
    await vi.advanceTimersByTimeAsync(0);

    // act
    configuration.storageStatus.set(
      storage({
        measured: false,
        admission: {
          state: 'unknown',
          reason: 'allocation-pending',
          availableBytes: 64 * GIB,
          reserveBytes: 20 * GIB,
          requiredGrowthBytes: 8 * GIB,
          shortfallBytes: 0,
        },
      }),
    );
    TestBed.tick();
    const pendingItems = source.items();
    configuration.storageStatus.set(blocked);
    TestBed.tick();

    // assert
    expect(pendingItems).toEqual([]);
    expect(notifications.showError).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable measurement without inventing free-space or required-growth numbers', () => {
    // arrange
    const current = storage({
      measured: false,
      filesystem: 'critical',
      admission: { state: 'unknown', reason: 'measurement-failed', reserveBytes: 20 * GIB },
    });
    const { source } = arrange(current, true);

    // act
    const items = source.items();

    // assert
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'storage:local-ci',
      severity: 'error',
      title: 'Local GitHub Actions cannot check storage',
    });
    expect(items[0]?.detail).toContain('Protected Mac reserve: 20.0 GB');
    expect(items[0]?.detail).not.toContain('Mac free:');
    expect(items[0]?.detail).not.toContain('required growth:');
    expect(items[0]?.detail).not.toContain('shortfall:');
  });

  it('shares a pending refresh, polls while connected and disposes even when a refresh finishes after teardown', async () => {
    // arrange
    vi.useFakeTimers();
    const { source, configuration, notifications } = arrange(storage({}), true);
    let finish: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    configuration.refreshStorageStatus.mockReturnValueOnce(pending);

    // act
    source.connect();
    source.connect();
    const first = source.refresh();
    const second = source.refresh();
    await vi.advanceTimersByTimeAsync(30_000);
    TestBed.resetTestingModule();
    finish();
    await first;
    await vi.advanceTimersByTimeAsync(120_000);

    // assert
    expect(first).toBe(second);
    expect(configuration.refreshStorageStatus).toHaveBeenCalledTimes(1);
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('checks enabled local CI every ten seconds, slows when disabled and cancels the timer on destruction', async () => {
    // arrange
    vi.useFakeTimers();
    const { source, configuration } = arrange(storage({}), true);

    // act
    source.connect();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    configuration.settings.update((settings) => ({
      ...settings,
      workspaces: settings.workspaces.map((workspace) => ({ ...workspace, localCiEnabled: false })),
    }));
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(30_000);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(120_000);

    // assert
    expect(configuration.refreshStorageStatus).toHaveBeenCalledTimes(3);
    expect(configuration.refreshStorageStatus).toHaveBeenCalledWith(true);
  });

  it('retries the bounded read after a transport rejection without manufacturing an execution failure', async () => {
    // arrange
    vi.useFakeTimers();
    const { source, configuration, notifications } = arrange(storage({}), true);
    configuration.refreshStorageStatus.mockRejectedValueOnce(
      new Error('IPC temporarily unavailable'),
    );

    // act
    source.connect();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);

    // assert
    expect(configuration.refreshStorageStatus).toHaveBeenCalledTimes(2);
    expect(source.items()).toEqual([]);
    expect(notifications.showError).not.toHaveBeenCalled();
  });
});
