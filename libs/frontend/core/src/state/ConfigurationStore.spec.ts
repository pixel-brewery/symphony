// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { NotificationService } from '@symphony/frontend-notification';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ORCHESTRATION_CLIENT } from '../clients/OrchestrationClient';
import { AUTOMATION_PREPARATION } from './AutomationPreparationToken';
import { ConfigurationStore } from './ConfigurationStore';
import type { IAutomationPreparation } from './IAutomationPreparation';
import type { IRepositoryRuntimeOperations } from './IRepositoryRuntimeOperations';
import { REPOSITORY_RUNTIME_OPERATIONS } from './RepositoryRuntimeOperationsToken';

// #endregion

function arrange() {
  const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings('/test'));
  const connections: ResponsePayload<'connections.get'> = {
    azureDevOps: { accounts: [] },
    github: { cliAvailable: false, accounts: [] },
    codex: { cliAvailable: false, accounts: [] },
    claude: { cliAvailable: false, accounts: [] },
  };
  const request = vi.fn(async (method: string) => {
    if (method === 'settings.get') return settings;
    if (method === 'connections.get') return connections;
    throw new Error(`Unexpected request: ${method}`);
  });
  const refreshRepositoryRuntime = vi.fn(async () => true);
  const repositories = { refreshRepositoryRuntime } satisfies Pick<
    IRepositoryRuntimeOperations,
    'refreshRepositoryRuntime'
  >;
  const notifyUnpreparedAutomaticExecution = vi.fn();
  const preparation = {
    notifyUnpreparedAutomaticExecution,
    unpreparedAutomaticRepositories: () => [],
  } satisfies IAutomationPreparation;
  const notifications = { showError: vi.fn(), showSuccess: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      ConfigurationStore,
      { provide: ORCHESTRATION_CLIENT, useValue: { request } },
      { provide: REPOSITORY_RUNTIME_OPERATIONS, useValue: repositories },
      { provide: AUTOMATION_PREPARATION, useValue: preparation },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return {
    store: TestBed.inject(ConfigurationStore),
    settings,
    connections,
    request,
    refreshRepositoryRuntime,
    notifyUnpreparedAutomaticExecution,
    notifications,
  };
}

describe('ConfigurationStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('keeps loaded settings and provider accounts when the repository owner reports an inspection failure', async () => {
    // arrange
    const test = arrange();
    test.refreshRepositoryRuntime.mockResolvedValue(false);

    // act
    await test.store.refreshConfiguration();

    // assert
    expect(test.store.settings()).toBe(test.settings);
    expect(test.store.connections()).toBe(test.connections);
    expect(test.refreshRepositoryRuntime).toHaveBeenCalledOnce();
    expect(test.request.mock.calls.map(([method]) => method)).toEqual([
      'settings.get',
      'connections.get',
    ]);
    expect(test.notifyUnpreparedAutomaticExecution).toHaveBeenCalledOnce();
    expect(test.notifications.showError).not.toHaveBeenCalled();
  });

  it('reports a real settings failure as configuration loading failure without starting dependent refreshes', async () => {
    // arrange
    const test = arrange();
    test.request.mockRejectedValueOnce(new Error('Settings are unavailable.'));

    // act
    await test.store.refreshConfiguration();

    // assert
    expect(test.store.settings()).toBeUndefined();
    expect(test.request).toHaveBeenCalledTimes(1);
    expect(test.refreshRepositoryRuntime).not.toHaveBeenCalled();
    expect(test.notifyUnpreparedAutomaticExecution).not.toHaveBeenCalled();
    expect(test.notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to load application configuration.',
      'Settings are unavailable.',
    );
  });

  it('scopes provider-account failure to provider feedback while retaining settings and refreshing repositories', async () => {
    // arrange
    const test = arrange();
    test.request.mockImplementation(async (method) => {
      if (method === 'settings.get') return test.settings;
      throw new Error('Provider accounts are unavailable.');
    });

    // act
    await test.store.refreshConfiguration();

    // assert
    expect(test.store.settings()).toBe(test.settings);
    expect(test.store.connections()).toBeUndefined();
    expect(test.refreshRepositoryRuntime).toHaveBeenCalledOnce();
    expect(test.notifyUnpreparedAutomaticExecution).toHaveBeenCalledOnce();
    expect(test.notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to load provider connections.',
      'Provider accounts are unavailable.',
    );
  });
});
