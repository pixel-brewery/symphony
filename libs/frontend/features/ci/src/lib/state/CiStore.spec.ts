// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';
import { NotificationService } from '@symphony/frontend-notification';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CI_CLIENT } from '../ports/CiClientToken';
import { CI_CONTEXT } from '../ports/CiContextToken';
import { CI_PROJECTION } from '../ports/CiProjectionToken';
import { CI_USAGE_CONTEXT } from '../ports/CiUsageContextToken';
import type { ICiUsageContext } from '../ports/ICiUsageContext';
import { CiStore } from './CiStore';

// #endregion

vi.mock('@symphony/frontend-core', () => ({
  NotificationService: class NotificationService {},
  operatorErrorMessage: (cause: unknown) => (cause instanceof Error ? cause.message : ''),
}));

function refreshResult(): ResponsePayload<'ci.runs.refresh'> {
  return { ciWorkflows: [], ciRuns: [], localCiExecutions: [], remoteData: { state: 'current' } };
}

function storeWith(request: ReturnType<typeof vi.fn>, settings?: ICiUsageContext['settings']) {
  const notifications = { showSuccess: vi.fn(), showError: vi.fn() };
  const projection = { applyRefresh: vi.fn(), prependRun: vi.fn(), updateStorageStatus: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      CiStore,
      { provide: NotificationService, useValue: notifications },
      { provide: CI_CLIENT, useValue: { request } },
      { provide: CI_PROJECTION, useValue: projection },
      ...(settings ? [{ provide: CI_USAGE_CONTEXT, useValue: { settings } }] : []),
      {
        provide: CI_CONTEXT,
        useValue: {
          runs: signal<readonly ICiRun[]>([]),
          workflows: signal<readonly ICiWorkflow[]>([]),
          remoteData: signal<IRemoteDataStatus | undefined>(undefined),
          localCiEnabledWorkspaceIds: signal<ReadonlySet<string>>(new Set()),
        },
      },
    ],
  });
  return { store: TestBed.inject(CiStore), notifications, projection };
}

describe('CiStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('bounds automatic machine-list retries after a failure until the user retries', async () => {
    // arrange
    const request = vi.fn().mockRejectedValue(new Error('temporary runner failure'));
    const { store, notifications } = storeWith(request);

    // act
    await store.refreshLocalCiInstances();
    await store.refreshLocalCiInstances();

    // assert
    expect(request).toHaveBeenCalledTimes(1);
    expect(notifications.showError).toHaveBeenCalledTimes(1);

    // act
    await store.refreshLocalCiInstances(true);

    // assert
    expect(request).toHaveBeenCalledTimes(2);
    expect(notifications.showError).toHaveBeenCalledTimes(2);
    expect(store.localCiInstancesBusy()).toBe(false);
  });

  it('bounds automatic image-catalog retries after a failure until the user retries', async () => {
    // arrange
    const request = vi.fn().mockRejectedValue(new Error('temporary catalog failure'));
    const { store, notifications } = storeWith(request);

    // act
    await store.refreshRunnerImages();
    await store.refreshRunnerImages();

    // assert
    expect(request).toHaveBeenCalledTimes(1);
    expect(notifications.showError).toHaveBeenCalledTimes(1);

    // act
    await store.refreshRunnerImages(true);

    // assert
    expect(request).toHaveBeenCalledTimes(2);
    expect(notifications.showError).toHaveBeenCalledTimes(2);
    expect(store.runnerImageBusy()).toBe(false);
  });

  it('coalesces overlapping refreshes while preserving a requested workflow catalog refresh', async () => {
    // arrange
    let complete: (result: ResponsePayload<'ci.runs.refresh'>) => void = () => undefined;
    const pendingResponse = new Promise<ResponsePayload<'ci.runs.refresh'>>((resolve) => {
      complete = resolve;
    });
    const result = refreshResult();
    const request = vi.fn().mockReturnValueOnce(pendingResponse).mockResolvedValue(result);
    const { store, projection } = storeWith(request);

    // act
    const first = store.refreshContinuousIntegrationRuns();
    const overlapping = store.refreshContinuousIntegrationRuns(true);
    const busyWhilePending = store.continuousIntegrationRunsBusy();
    complete(result);
    await Promise.all([first, overlapping]);

    // assert
    expect(first).toBe(overlapping);
    expect(busyWhilePending).toBe(true);
    expect(store.continuousIntegrationRunsBusy()).toBe(false);
    expect(request.mock.calls).toEqual([
      ['ci.runs.refresh', {}],
      ['ci.runs.refresh', { includeWorkflowCatalog: true }],
    ]);
    expect(projection.applyRefresh).toHaveBeenCalledTimes(2);
  });

  it('keeps one local run owner and releases its state after a failed request', async () => {
    // arrange
    let rejectRun: (cause: Error) => void = () => undefined;
    const pendingRun = new Promise<never>((_resolve, reject) => {
      rejectRun = reject;
    });
    const request = vi.fn((method: string) =>
      method === 'ci.local.run' ? pendingRun : Promise.resolve(refreshResult()),
    );
    const { store } = storeWith(request);
    vi.spyOn(window, 'setTimeout').mockReturnValue(1);

    // act
    const first = store.runCiLocally('run-1');
    const activeRun = store.localCiRunningRunId();
    await store.runCiWorkflowLocally('workflow-2', 'main');
    rejectRun(new Error('runner unavailable'));
    await first;

    // assert
    expect(activeRun).toBe('run-1');
    expect(request.mock.calls.map(([method]) => method)).toEqual([
      'ci.local.run',
      'ci.runs.refresh',
    ]);
    expect(store.localCiRunningRunId()).toBeUndefined();
    expect(store.localCiStartedAt()).toBeUndefined();
  });

  it('does not restart polling when an in-flight refresh settles after injector destruction', async () => {
    // arrange
    let complete: (result: ResponsePayload<'ci.runs.refresh'>) => void = () => undefined;
    const response = new Promise<ResponsePayload<'ci.runs.refresh'>>((resolve) => {
      complete = resolve;
    });
    const request = vi.fn().mockReturnValue(response);
    const { store } = storeWith(request);
    const schedule = vi.spyOn(window, 'setTimeout').mockReturnValue(1);
    const pending = store.refreshContinuousIntegrationRuns();

    // act
    TestBed.resetTestingModule();
    complete({
      ...refreshResult(),
      activeLocalCiRun: { runId: 'run-active', startedAt: '2026-10-30T10:00:00.000Z' },
    });
    await pending;

    // assert
    expect(schedule).not.toHaveBeenCalled();
  });

  it('qualifies usage from enabled GitHub repositories and Actions bindings in the selected workspace', async () => {
    // arrange
    const report = { repositoryBindingId: 'visible', minutes: { used: 7 } };
    const request = vi.fn().mockResolvedValue([report]);
    const { store } = storeWith(request, signal(usageSettings()));

    // act
    const result = await store.refreshContinuousIntegrationUsage();

    // assert
    expect(result).toBe(true);
    expect(request).toHaveBeenCalledExactlyOnceWith('ci.usage.get', {
      repositoryBindingIds: ['visible'],
    });
    expect(store.continuousIntegrationUsageReport('visible')).toEqual(report);
    expect(store.continuousIntegrationUsageReport('unreported')).toBeUndefined();
    expect(store.continuousIntegrationUsageBusy()).toBe(false);
  });

  it('deduplicates explicit repository requests and exposes the same busy lifecycle until the result arrives', async () => {
    // arrange
    let complete: (value: ResponsePayload<'ci.usage.get'>) => void = () => undefined;
    const response = new Promise<ResponsePayload<'ci.usage.get'>>((resolve) => {
      complete = resolve;
    });
    const request = vi.fn().mockReturnValue(response);
    const { store } = storeWith(request, signal(usageSettings()));

    // act
    const pending = store.refreshContinuousIntegrationUsage(['outside-scope', 'outside-scope']);
    const active = store.continuousIntegrationUsageBusy();
    complete([{ repositoryBindingId: 'outside-scope' }]);
    const result = await pending;

    // assert
    expect(active).toBe(true);
    expect(result).toBe(true);
    expect(store.continuousIntegrationUsageBusy()).toBe(false);
    expect(request).toHaveBeenCalledExactlyOnceWith('ci.usage.get', {
      repositoryBindingIds: ['outside-scope'],
    });
  });

  it('clears previous usage without a request when the configured scope has no eligible repository', async () => {
    // arrange
    const request = vi.fn().mockResolvedValue([{ repositoryBindingId: 'old' }]);
    const settings = signal(usageSettings());
    const { store } = storeWith(request, settings);
    await store.refreshContinuousIntegrationUsage(['old']);
    settings.set({ ...usageSettings(), repositoryBindings: [] });

    // act
    const result = await store.refreshContinuousIntegrationUsage();

    // assert
    expect(result).toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(store.continuousIntegrationUsage()).toEqual([]);
    expect(store.continuousIntegrationUsageBusy()).toBe(false);
  });

  it('clears failed reports and preserves silent versus explicit error reporting', async () => {
    // arrange
    const request = vi.fn().mockRejectedValue(new Error('Unavailable'));
    const { store, notifications } = storeWith(request);

    // act
    const silent = await store.refreshContinuousIntegrationUsage(['repository'], true);
    const explicit = await store.refreshContinuousIntegrationUsage(['repository']);

    // assert
    expect(silent).toBe(false);
    expect(explicit).toBe(false);
    expect(store.continuousIntegrationUsage()).toEqual([]);
    expect(store.continuousIntegrationUsageBusy()).toBe(false);
    expect(notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to load GitHub Actions usage.',
      'Unavailable',
    );
  });
});

function usageSettings(): NonNullable<ReturnType<ICiUsageContext['settings']>> {
  return {
    activeViewScope: { workspaceIds: ['selected'], boardLayout: 'mixed' },
    repositoryBindings: [
      repository('visible', 'selected', 'github', true),
      repository('disabled', 'selected', 'github', false),
      repository('other-workspace', 'other', 'github', true),
      repository('simulated', 'selected', 'simulated', true),
    ],
    ciBindings: [
      binding('first', 'visible', 'github-actions', true),
      binding('same-repository', 'visible', 'github-actions', true),
      binding('disabled-repository', 'disabled', 'github-actions', true),
      binding('outside', 'other-workspace', 'github-actions', true),
      binding('simulated-repository', 'simulated', 'github-actions', true),
      binding('disabled-binding', 'visible', 'github-actions', false),
      binding('simulated-binding', 'visible', 'simulated', true),
    ],
  };
}

function repository(
  id: string,
  workspaceId: string,
  provider: 'github' | 'simulated',
  enabled: boolean,
): ApplicationSettingsDto['repositoryBindings'][number] {
  return {
    id,
    workspaceId,
    provider,
    enabled,
    sourceControlConnectionId: 'source',
    displayName: id,
    host: 'github.com',
    owner: 'owner',
    name: id,
    defaultBranch: 'main',
    localPath: '',
  };
}

function binding(
  id: string,
  repositoryBindingId: string,
  provider: 'github-actions' | 'simulated',
  enabled: boolean,
): ApplicationSettingsDto['ciBindings'][number] {
  return {
    id,
    repositoryBindingId,
    provider,
    enabled,
    workspaceId: 'selected',
    sourceControlConnectionId: 'source',
    displayName: id,
    agenticDeliveryEnabled: false,
  };
}
