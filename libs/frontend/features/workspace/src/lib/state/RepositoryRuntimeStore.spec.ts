// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { NotificationService, type INotificationMessage } from '@symphony/frontend-notification';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IRepositoryRuntimeClient } from '../ports/IRepositoryRuntimeClient';
import { REPOSITORY_RUNTIME_CLIENT } from '../ports/RepositoryRuntimeClientToken';
import { RepositoryRuntimeStore } from './RepositoryRuntimeStore';

// #endregion

type Method =
  | 'repositories.runtime.list'
  | 'repositories.prepare'
  | 'verification.plan'
  | 'verification.run'
  | 'verification.cancel';
type Status = ResponsePayload<'repositories.prepare'>;

function status(id = 'repository-a'): Status {
  return {
    repositoryBindingId: id,
    workspaceId: 'personal',
    displayName: id,
    repositoryIdentity: id,
    preparation: {
      state: 'prepared',
      path: '/managed/' + id,
      revision: 'revision-1',
      managed: true,
    },
    trust: { state: 'trusted', capabilities: [] },
  };
}

function arrange(
  handlers: Partial<{ [M in Method]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>> }>,
  order: string[] = [],
) {
  const client: IRepositoryRuntimeClient = {
    async request<M extends Method>(
      method: M,
      payload: RequestPayload<M>,
    ): Promise<ResponsePayload<M>> {
      const handler = handlers[method];
      if (!handler) throw new Error('Unexpected request: ' + method);
      return handler(payload);
    },
  };
  const delivered = vi.fn<(notification: INotificationMessage, repeated?: boolean) => void>();
  const dispatcher = new NotificationService([{ push: delivered }]);
  const notifications = {
    showError: vi.fn((title: string, content?: string, groupKey?: string) =>
      dispatcher.showError(title, content, groupKey),
    ),
    resolveError: vi.fn((groupKey: string) => dispatcher.resolveError(groupKey)),
    showSuccess: vi.fn(() => {
      order.push('success');
    }),
    showWarning: vi.fn(),
  };
  const refreshSettings = vi.fn(async () => {
    order.push('settings');
  });
  const settings = signal(
    applicationSettingsSchema.parse(createDefaultApplicationSettings('/repositories')),
  );
  TestBed.configureTestingModule({
    providers: [
      RepositoryRuntimeStore,
      { provide: REPOSITORY_RUNTIME_CLIENT, useValue: client },
      {
        provide: ConfigurationStore,
        useValue: { refreshSettings, settings } satisfies Pick<
          ConfigurationStore,
          'refreshSettings' | 'settings'
        >,
      },
      {
        provide: AUTOMATION_PREPARATION,
        useValue: {
          notifyUnpreparedAutomaticExecution: () => order.push('warning'),
          unpreparedAutomaticRepositories: () => [],
        },
      },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return {
    store: TestBed.inject(RepositoryRuntimeStore),
    refreshSettings,
    notifications,
    settings,
    delivered,
  };
}

describe('RepositoryRuntimeStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('keeps healthy statuses and surfaces the failed binding when a read-only inspection partly fails', async () => {
    // arrange
    const failed: Status = {
      ...status('repository-a'),
      displayName: 'Broken checkout',
      preparation: {
        state: 'unprepared',
        inspectionError: 'fatal: not a git repository',
      },
    };
    const healthy = status('repository-b');
    const { store, notifications } = arrange({
      'repositories.runtime.list': async () => [failed, healthy],
    });

    // act
    const inspected = await store.refreshRepositoryRuntime();

    // assert
    expect(inspected).toBe(false);
    expect(store.repositoryRuntimeStatuses()).toEqual([failed, healthy]);
    expect(notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to inspect the local repository.',
      'Personal › Broken checkout: fatal: not a git repository',
      JSON.stringify(['repository-inspection', 'personal', 'repository-a']),
    );
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('replaces a failed binding with recovered state without losing other repository statuses', async () => {
    // arrange
    const previous: Status = {
      ...status('repository-a'),
      preparation: { state: 'unprepared', inspectionError: 'Temporary inspection failure.' },
    };
    const recovered = status('repository-a');
    const healthy = status('repository-b');
    const { store, notifications } = arrange({
      'repositories.runtime.list': async () => [recovered],
    });
    store.applyRepositoryRuntimeStatuses([previous, healthy]);

    // act
    const inspected = await store.refreshRepositoryRuntime('repository-a');

    // assert
    expect(inspected).toBe(true);
    expect(store.repositoryRuntimeStatus('repository-a')).toBe(recovered);
    expect(store.repositoryRuntimeStatus('repository-b')).toBe(healthy);
    expect(notifications.resolveError).toHaveBeenCalledWith(
      JSON.stringify(['repository-inspection', 'personal', 'repository-a']),
    );
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('scopes failures to their own workspace even when other workspaces are selected', async () => {
    // arrange
    const first: Status = {
      ...status('repository-a'),
      displayName: 'Example',
      preparation: { state: 'unprepared', inspectionError: 'invalid Git' },
    };
    const second: Status = { ...first, repositoryBindingId: 'repository-b', workspaceId: 'team' };
    const { store, notifications, settings } = arrange({
      'repositories.runtime.list': async () => [first, second],
    });
    const personal = settings().workspaces[0];
    if (!personal) throw new Error('Missing fixture workspace.');
    settings.update((current) => ({
      ...current,
      workspaces: [...current.workspaces, { ...personal, id: 'team', displayName: 'Team' }],
    }));

    // act
    await store.refreshRepositoryRuntime();

    // assert
    expect(notifications.showError).toHaveBeenNthCalledWith(
      1,
      'Unable to inspect the local repository.',
      'Personal › Example: invalid Git',
      JSON.stringify(['repository-inspection', 'personal', 'repository-a']),
    );
    expect(notifications.showError).toHaveBeenNthCalledWith(
      2,
      'Unable to inspect the local repository.',
      'Team › Example: invalid Git',
      JSON.stringify(['repository-inspection', 'team', 'repository-b']),
    );
  });

  it('keeps resource error groups distinct when identifiers contain separators', async () => {
    // arrange
    const first: Status = {
      ...status('c'),
      workspaceId: 'a:b',
      preparation: { state: 'unprepared', inspectionError: 'invalid Git' },
    };
    const second: Status = { ...first, workspaceId: 'a', repositoryBindingId: 'b:c' };
    const { store, notifications } = arrange({
      'repositories.runtime.list': async () => [first, second],
    });

    // act
    await store.refreshRepositoryRuntime();

    // assert
    const keys = notifications.showError.mock.calls.map((call) => call[2]);
    expect(keys).toEqual([
      JSON.stringify(['repository-inspection', 'a:b', 'c']),
      JSON.stringify(['repository-inspection', 'a', 'b:c']),
    ]);
    expect(new Set(keys).size).toBe(2);
  });

  it('retains the last confirmed statuses when the repository transport itself fails', async () => {
    // arrange
    const previous = status('repository-a');
    const { store, notifications } = arrange({
      'repositories.runtime.list': async () => {
        throw new Error('Repository status request is unavailable.');
      },
    });
    store.applyRepositoryRuntimeStatuses([previous]);

    // act
    const inspected = await store.refreshRepositoryRuntime();

    // assert
    expect(inspected).toBe(false);
    expect(store.repositoryRuntimeStatuses()).toEqual([previous]);
    expect(notifications.showError).toHaveBeenCalledExactlyOnceWith(
      'Unable to refresh local repository statuses.',
      'All configured workspaces: Repository status request is unavailable.',
      JSON.stringify(['repository-status-refresh', null]),
    );
  });

  it.each(['refresh', 'silent'] as const)(
    'notifies a targeted transport failure again after a successful full %s confirms its recovery',
    async (recovery) => {
      // arrange
      const confirmed = status('repository-a');
      const { store, delivered } = arrange({
        'repositories.runtime.list': async ({ repositoryBindingId }) => {
          if (repositoryBindingId) throw new Error('Repository transport is unavailable.');
          return [confirmed];
        },
      });
      await store.refreshRepositoryRuntime('repository-a');

      // act
      if (recovery === 'refresh') await store.refreshRepositoryRuntime();
      else store.applyRepositoryRuntimeStatuses([confirmed]);
      await store.refreshRepositoryRuntime('repository-a');

      // assert
      expect(delivered).toHaveBeenCalledTimes(2);
      expect(delivered.mock.calls.map((call) => call[1])).toEqual([undefined, undefined]);
      expect(store.repositoryRuntimeStatus('repository-a')).toBe(confirmed);
    },
  );

  it('shares one guard across preparation, verification planning and execution while retaining reconciliation order', async () => {
    // arrange
    let finish: (value: Status) => void = () => undefined;
    const pending = new Promise<Status>((resolve) => {
      finish = resolve;
    });
    const prepare = vi.fn<() => Promise<Status>>().mockReturnValue(pending);
    const order: string[] = [];
    const { store, notifications } = arrange({ 'repositories.prepare': prepare }, order);

    // act
    const preparation = store.prepareRepository('repository-a');
    const planned = await store.planVerification('repository-b');
    const verified = await store.runVerification('repository-b', 'plan-b', 'once');

    // assert
    expect(planned).toBe(false);
    expect(verified).toBe(false);
    expect(store.repositoryRuntimeBusy()).toBe('repository-a');
    expect(prepare).toHaveBeenCalledOnce();
    const prepared = status();
    finish(prepared);
    expect(await preparation).toBe(true);
    expect(store.repositoryRuntimeStatus('repository-a')).toBe(prepared);
    expect(store.repositoryRuntimeBusy()).toBeUndefined();
    expect(order).toEqual(['settings', 'warning', 'success']);
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('retains failed verification evidence, refreshes only its repository and releases both running flags', async () => {
    // arrange
    const run: ResponsePayload<'verification.run'> = {
      id: 'run-a',
      workspaceId: 'personal',
      repositoryBindingId: 'repository-a',
      planId: 'plan-a',
      revision: 'revision-1',
      approval: 'once',
      state: 'failed',
      startedAt: '2026-10-30T12:00:00.000Z',
      finishedAt: '2026-10-30T12:01:00.000Z',
      steps: [],
    };
    const inspected = status();
    const other = status('repository-b');
    const { store, notifications } = arrange({
      'verification.run': async () => run,
      'repositories.runtime.list': async () => [inspected],
    });
    store.applyRepositoryRuntimeStatuses([other]);

    // act
    const succeeded = await store.runVerification('repository-a', 'plan-a', 'once');

    // assert
    expect(succeeded).toBe(false);
    expect(store.verificationRun()).toBe(run);
    expect(store.repositoryRuntimeStatus('repository-a')).toBe(inspected);
    expect(store.repositoryRuntimeStatus('repository-b')).toBe(other);
    expect(store.repositoryRuntimeBusy()).toBeUndefined();
    expect(store.verificationRunningRepositoryId()).toBeUndefined();
    expect(notifications.showWarning).toHaveBeenCalledExactlyOnceWith(
      'Local verification failed.',
      'Review the verification results before continuing.',
    );
  });
});
