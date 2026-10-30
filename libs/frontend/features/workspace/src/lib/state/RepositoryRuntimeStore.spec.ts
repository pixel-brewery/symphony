// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { NotificationService } from '@symphony/frontend-notification';
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
  const notifications = {
    showError: vi.fn(),
    showSuccess: vi.fn(() => {
      order.push('success');
    }),
    showWarning: vi.fn(),
  };
  const refreshSettings = vi.fn(async () => {
    order.push('settings');
  });
  TestBed.configureTestingModule({
    providers: [
      RepositoryRuntimeStore,
      { provide: REPOSITORY_RUNTIME_CLIENT, useValue: client },
      {
        provide: ConfigurationStore,
        useValue: { refreshSettings } satisfies Pick<ConfigurationStore, 'refreshSettings'>,
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
  return { store: TestBed.inject(RepositoryRuntimeStore), refreshSettings, notifications };
}

describe('RepositoryRuntimeStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

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
