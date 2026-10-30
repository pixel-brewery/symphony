// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ThemeService } from '@pixel-brewery/mosaik-elements-angular';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { PLATFORM_OPERATIONS } from '@symphony/frontend-core/platform';
import { OrchestrationState } from '@symphony/frontend-core/testing/orchestration';
import { NotificationService } from '@symphony/frontend-notification';
import type {
  IOrchestrationSnapshot,
  RequestPayload,
  ResponsePayload,
} from '@symphony/ipc-contracts-composition';
import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IPlatformClient } from '../ports/IPlatformClient';
import { providePlatformFeature } from '../provider/providePlatformFeature';
import { PlatformStore } from './PlatformStore';

// #endregion

type Method = 'health.get' | 'runtime-dependencies.install' | 'external-services.incidents.get';

function health(githubAvailable = false): RuntimeHealthDto {
  return {
    status: 'ready',
    utilityProcess: true,
    database: true,
    homebrew: { available: true },
    git: { available: true },
    githubCli: { available: githubAvailable },
    agents: {
      codex: { available: false },
      claude: { available: false },
      opencode: { available: false },
    },
  };
}

function arrange(
  handlers: Partial<{ [M in Method]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>> }>,
) {
  const client: IPlatformClient = {
    async request<M extends Method>(
      method: M,
      payload: RequestPayload<M>,
    ): Promise<ResponsePayload<M>> {
      const handler = handlers[method];
      if (!handler) throw new Error('Unexpected request: ' + method);
      return handler(payload);
    },
  };
  const notifications = { showError: vi.fn(), showSuccess: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      providePlatformFeature(),
      { provide: ThemeService, useValue: { applyTheme: vi.fn<ThemeService['applyTheme']>() } },
      { provide: ORCHESTRATION_CLIENT, useValue: client },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  const snapshot: IOrchestrationSnapshot = {
    health: health(),
    workItems: [],
    boardColumns: [],
    executions: [],
    events: [],
    workflow: defaultWorkflow,
    skills: [],
  };
  const state = TestBed.inject(OrchestrationState);
  state.snapshot.set(snapshot);
  return {
    state,
    snapshot,
    notifications,
    store: TestBed.inject(PlatformStore),
    operations: TestBed.inject(PLATFORM_OPERATIONS),
  };
}

describe('PlatformStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares native installer exclusion and updates only the existing snapshot health', async () => {
    // arrange
    let finish: (value: RuntimeHealthDto) => void = () => undefined;
    const pending = new Promise<RuntimeHealthDto>((resolve) => {
      finish = resolve;
    });
    const install = vi.fn<() => Promise<RuntimeHealthDto>>().mockReturnValue(pending);
    const { state, snapshot, store, operations, notifications } = arrange({
      'runtime-dependencies.install': install,
    });

    // act
    const installation = operations.installRuntimeDependency('gh');
    const overlapped = await store.installRuntimeDependency('git');

    // assert
    expect(operations).toBe(store);
    expect(overlapped).toBe(false);
    expect(operations.runtimeDependencyInstallBusy()).toBe('gh');
    expect(install).toHaveBeenCalledOnce();
    const inspected = health(true);
    finish(inspected);
    expect(await installation).toBe(true);
    expect(operations.runtimeDependencyInstallBusy()).toBeUndefined();
    expect(state.snapshot()?.health).toBe(inspected);
    expect(state.snapshot()?.workItems).toBe(snapshot.workItems);
    expect(store.runtimeHealth()).toBe(inspected);
    expect(notifications.showSuccess).toHaveBeenCalledExactlyOnceWith(
      'GitHub CLI installed.',
      'The command is ready for Symphony.',
    );
  });

  it('retains confirmed health and releases installation exclusion after native failure', async () => {
    // arrange
    const { snapshot, store, notifications } = arrange({
      'runtime-dependencies.install': async () => {
        throw new Error('Homebrew could not download the package.');
      },
    });

    // act
    const installed = await store.installRuntimeDependency('gh');

    // assert
    expect(installed).toBe(false);
    expect(store.runtimeDependencyInstallBusy()).toBeUndefined();
    expect(store.runtimeHealth()).toBe(snapshot.health);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
    expect(notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to install GitHub CLI.',
      'Homebrew could not download the package.',
    );
  });

  it('coalesces native inspections and suppresses only background inspection failures', async () => {
    // arrange
    let fail: (cause: Error) => void = () => undefined;
    const pending = new Promise<RuntimeHealthDto>((_resolve, reject) => {
      fail = reject;
    });
    const inspect = vi.fn<() => Promise<RuntimeHealthDto>>().mockReturnValue(pending);
    const { snapshot, store, notifications } = arrange({ 'health.get': inspect });

    // act
    const inspection = store.refreshRuntimeHealth(true);
    await store.refreshRuntimeHealth();
    fail(new Error('Inspection timed out.'));
    await inspection;

    // assert
    expect(inspect).toHaveBeenCalledOnce();
    expect(store.runtimeHealthBusy()).toBe(false);
    expect(store.runtimeHealth()).toBe(snapshot.health);
    expect(notifications.showError).not.toHaveBeenCalled();
    await store.refreshRuntimeHealth();
    expect(notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to inspect developer tools.',
      'Inspection timed out.',
    );
  });

  it('owns one incident poll and retains the last confirmed incidents across a failed refresh', async () => {
    // arrange
    vi.useFakeTimers();
    const incidents: ResponsePayload<'external-services.incidents.get'> = [
      {
        id: 'incident-a',
        providerName: 'GitHub',
        severity: 'degraded',
        affectedComponents: ['Issues'],
        affectedCapabilities: ['work-items'],
        updatedAt: '2026-10-30T12:00:00.000Z',
      },
    ];
    const read = vi
      .fn<() => Promise<ResponsePayload<'external-services.incidents.get'>>>()
      .mockResolvedValueOnce(incidents)
      .mockRejectedValue(new Error('Status page unavailable.'));
    const { store } = arrange({ 'external-services.incidents.get': read });

    // act
    store.initializeIncidents();
    store.initializeIncidents();
    await vi.advanceTimersByTimeAsync(60_000);

    // assert
    expect(read).toHaveBeenCalledTimes(2);
    expect(store.externalServiceIncidents()).toBe(incidents);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('cannot recreate the incident timer after a pending read outlives its application owner', async () => {
    // arrange
    vi.useFakeTimers();
    let finish: (value: ResponsePayload<'external-services.incidents.get'>) => void = () =>
      undefined;
    const pending = new Promise<ResponsePayload<'external-services.incidents.get'>>((resolve) => {
      finish = resolve;
    });
    const read = vi
      .fn<() => Promise<ResponsePayload<'external-services.incidents.get'>>>()
      .mockReturnValue(pending);
    const { store } = arrange({ 'external-services.incidents.get': read });
    store.initializeIncidents();

    // act
    TestBed.resetTestingModule();
    finish([]);
    await vi.advanceTimersByTimeAsync(120_000);

    // assert
    expect(read).toHaveBeenCalledOnce();
  });
});
