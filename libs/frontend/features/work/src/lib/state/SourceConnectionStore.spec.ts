// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { NotificationService } from '@symphony/frontend-notification';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WORK_CONNECTION_CLIENT } from '../ports/WorkConnectionClientToken';
import { WORK_CONNECTION_PROJECTION } from '../ports/WorkConnectionProjectionToken';
import type { IWorkConnectionProjection } from '../ports/IWorkConnectionProjection';
import type { IWorkConnectionRefresh } from '../ports/IWorkConnectionRefresh';
import { WORK_CONNECTION_REFRESH } from '../ports/WorkConnectionRefreshToken';
import { SourceConnectionStore } from './SourceConnectionStore';

// #endregion

describe('SourceConnectionStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('keeps GitHub authentication busy through account projection and the original silent CI-usage refresh', async () => {
    // arrange
    const { store, request, projection, refresh, notifications, calls } = arrange();
    let finish: ((value: boolean) => void) | undefined;
    const pending = new Promise<boolean>((resolve) => {
      finish = resolve;
    });
    refresh.refreshContinuousIntegrationUsage.mockImplementation(() => {
      calls.push('ci');
      return pending;
    });

    // act
    const operation = store.connectGitHub({
      mode: 'browser',
      hostname: 'github.com',
      gitProtocol: 'https',
    });
    await vi.waitFor(() =>
      expect(refresh.refreshContinuousIntegrationUsage).toHaveBeenCalledOnce(),
    );
    const busyDuringRefresh = store.connectionBusy();
    finish?.(true);
    const result = await operation;

    // assert
    expect(result).toBe(true);
    expect(busyDuringRefresh).toBe(true);
    expect(store.connectionBusy()).toBe(false);
    expect(calls).toEqual(['github.login.start', 'connections.get', 'apply', 'ci']);
    expect(request).toHaveBeenCalledWith('github.login.start', {
      mode: 'browser',
      hostname: 'github.com',
      gitProtocol: 'https',
    });
    expect(projection.applyProviderConnections).toHaveBeenCalledExactlyOnceWith(connections());
    expect(refresh.refreshContinuousIntegrationUsage).toHaveBeenCalledExactlyOnceWith(
      undefined,
      true,
    );
    expect(refresh.refreshSettings).not.toHaveBeenCalled();
    expect(notifications.showSuccess).toHaveBeenCalledExactlyOnceWith('Completed');
  });

  it('reloads source settings after Azure credential removal and reports an uncompleted login without refreshing projections', async () => {
    // arrange
    const { store, request, projection, refresh, notifications, calls } = arrange();

    // act
    await store.disconnectAzureDevOps('azure');
    const completedCalls = [...calls];
    request.mockResolvedValueOnce({ status: 'started', message: 'Continue in browser' });
    await store.connectGitHub({ mode: 'browser', hostname: 'github.com', gitProtocol: 'https' });

    // assert
    expect(completedCalls).toEqual(['azure-devops.logout', 'connections.get', 'apply', 'settings']);
    expect(projection.applyProviderConnections).toHaveBeenCalledOnce();
    expect(refresh.refreshSettings).toHaveBeenCalledOnce();
    expect(refresh.refreshContinuousIntegrationUsage).not.toHaveBeenCalled();
    expect(notifications.showInfo).toHaveBeenCalledExactlyOnceWith('Continue in browser');
    expect(store.connectionBusy()).toBe(false);
  });

  it('preserves a failed account read as a failed operation and always releases its own busy state', async () => {
    // arrange
    const { store, request, projection, refresh, notifications } = arrange();
    request.mockImplementation(async (method: string) => {
      if (method === 'connections.get') throw new Error('Account refresh failed');
      return { status: 'completed', message: 'Completed' };
    });

    // act
    const result = await store.connectAzureDevOps('azure', 'fixture-token');

    // assert
    expect(result).toBe(false);
    expect(store.connectionBusy()).toBe(false);
    expect(projection.applyProviderConnections).not.toHaveBeenCalled();
    expect(refresh.refreshSettings).not.toHaveBeenCalled();
    expect(notifications.showError).toHaveBeenCalledWith(
      'Unable to update provider connection.',
      expect.any(String),
    );
  });

  it('retains the two list failure payloads without starting account activity', async () => {
    // arrange
    const { store, request } = arrange();
    request.mockRejectedValue(new Error('Unavailable'));

    // act
    const projects = await store.listGitHubProjects({
      workspaceId: 'personal',
      connectionId: 'github',
    });
    const columns = await store.listWorkItemSourceColumns({
      source: {
        id: 'board',
        workspaceId: 'personal',
        provider: 'github-projects',
        connectionId: 'github',
        displayName: 'Board',
        owner: 'example',
        ownerType: 'organization',
        projectNumber: 1,
        enabled: true,
        columnMappings: [],
      },
    });

    // assert
    expect(projects).toEqual({ projects: [], error: 'Unavailable' });
    expect(columns).toEqual({ columns: [], error: 'Unavailable' });
    expect(store.connectionBusy()).toBe(false);
  });
});

function arrange() {
  const calls: string[] = [];
  const request = vi.fn<(method: string, payload?: unknown) => Promise<unknown>>(async (method) => {
    calls.push(method);
    return method === 'connections.get'
      ? connections()
      : { status: 'completed', message: 'Completed' };
  });
  const projection = {
    applyProviderConnections: vi.fn<IWorkConnectionProjection['applyProviderConnections']>(() => {
      calls.push('apply');
    }),
  };
  const refresh = {
    refreshSettings: vi.fn(async (): Promise<void> => {
      calls.push('settings');
    }),
    refreshContinuousIntegrationUsage: vi.fn<
      IWorkConnectionRefresh['refreshContinuousIntegrationUsage']
    >(async () => {
      calls.push('ci');
      return true;
    }),
  };
  const notifications = { showSuccess: vi.fn(), showInfo: vi.fn(), showError: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      SourceConnectionStore,
      { provide: WORK_CONNECTION_CLIENT, useValue: { request } },
      { provide: WORK_CONNECTION_PROJECTION, useValue: projection },
      { provide: WORK_CONNECTION_REFRESH, useValue: refresh },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return {
    store: TestBed.inject(SourceConnectionStore),
    request,
    projection,
    refresh,
    notifications,
    calls,
  };
}

function connections(): ResponsePayload<'connections.get'> {
  return {
    azureDevOps: { accounts: [] },
    github: { cliAvailable: true, accounts: [] },
    codex: { cliAvailable: false, accounts: [] },
    claude: { cliAvailable: false, accounts: [] },
  };
}
