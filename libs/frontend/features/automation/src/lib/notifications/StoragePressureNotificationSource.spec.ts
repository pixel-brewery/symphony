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
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { StoragePressureNotificationSource } from './StoragePressureNotificationSource';

// #endregion

type StorageStatus = ResponsePayload<'storage.status.get'>;
type Pressure = StorageStatus['global']['pressure'];

const GIB = 1024 ** 3;

function usage(id: string, pressure: Pressure, workspaceId?: string) {
  return {
    id,
    label: id,
    ...(workspaceId ? { workspaceId } : {}),
    allocatedBytes: 45 * GIB,
    limitBytes: 50 * GIB,
    usagePercent: 90,
    pressure,
    segments: [],
  };
}

function storage(options: {
  managed?: Pressure;
  filesystem?: Pressure;
  workspace?: Pressure;
  writable?: boolean;
}): StorageStatus {
  return {
    measuredAt: '2026-10-30T10:00:00.000Z',
    measured: true,
    writable: options.writable ?? true,
    global: usage('global', options.managed ?? 'healthy'),
    localCi: usage('local-ci', 'healthy'),
    workspaces: [usage('personal', options.workspace ?? 'healthy', 'personal')],
    filesystem: {
      availableBytes: 12 * GIB,
      reserveBytes: 20 * GIB,
      pressure: options.filesystem ?? 'healthy',
    },
  } as unknown as StorageStatus;
}

function arrange(status: StorageStatus | undefined) {
  const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings('/storage'));
  const configuration = {
    settings: signal(settings),
    storageStatus: signal(status),
    refreshStorageStatus: vi.fn(async () => undefined),
  };
  const desktop = { request: vi.fn(async () => ({ completed: true })) };
  TestBed.configureTestingModule({
    providers: [
      StoragePressureNotificationSource,
      { provide: ConfigurationStore, useValue: configuration },
      { provide: DESKTOP_CLIENT, useValue: desktop },
    ],
  });
  return { source: TestBed.inject(StoragePressureNotificationSource), configuration, desktop };
}

describe('StoragePressureNotificationSource', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
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
        detail: '12.0 GB free · Symphony keeps 20.0 GB free',
      },
      {
        id: 'storage:workspace:personal',
        severity: 'error',
        title: 'Personal has reached its storage limit',
        location: ['Personal', 'Administration'],
        detail: '45.0 GB of 50.0 GB in use',
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
});
