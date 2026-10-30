// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { NotificationService } from '@symphony/frontend-notification';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IAiContext } from '../ports/IAiContext';
import { AI_CLIENT } from '../ports/AiClientToken';
import { AI_CONTEXT } from '../ports/AiContextToken';
import { AI_CONFIGURATION } from '../ports/AiConfigurationToken';
import { AiStore } from './AiStore';

// #endregion

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Deferred operation not initialized.');
  };
  let reject: (cause: unknown) => void = () => {
    throw new Error('Deferred operation not initialized.');
  };
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
function configuration(usedPercent: number): ResponsePayload<'codex.configuration.get'> {
  return { models: [], usage: { windows: [{ usedPercent, remainingPercent: 100 - usedPercent }] } };
}
function arrange(request: (method: string, payload: unknown) => Promise<unknown>) {
  const context: IAiContext = {
    nativeInstallAvailable: false,
    settings: signal<ApplicationSettingsDto | undefined>(
      applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp')),
    ),
    configurationBusy: signal(false),
    editorBusy: signal(false),
    connections: signal(undefined),
    runtimeHealth: signal(undefined),
    runtimeDependencyInstallBusy: signal(undefined),
  };
  const notifications = { showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() };
  const refreshProviderConnections = vi.fn(async () => undefined);
  TestBed.configureTestingModule({
    providers: [
      AiStore,
      { provide: AI_CLIENT, useValue: { request } },
      { provide: AI_CONTEXT, useValue: context },
      { provide: AI_CONFIGURATION, useValue: { refreshProviderConnections } },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { store: TestBed.inject(AiStore), notifications, refreshProviderConnections };
}

describe('AiStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('prevents an older account result from replacing the current account or clearing its busy flag', async () => {
    // arrange
    const first = deferred<ResponsePayload<'codex.configuration.get'>>();
    const second = deferred<ResponsePayload<'codex.configuration.get'>>();
    const request = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { store } = arrange(request);
    const firstRefresh = store.refreshCodexConfiguration('account-a');
    const secondRefresh = store.refreshCodexConfiguration('account-b');

    // act
    first.resolve(configuration(80));
    const staleAccepted = await firstRefresh;
    const busyAfterStale = store.codexConfigurationBusy();
    second.resolve(configuration(20));
    const currentAccepted = await secondRefresh;

    // assert
    expect(staleAccepted).toBe(false);
    expect(busyAfterStale).toBe(true);
    expect(currentAccepted).toBe(true);
    expect(store.codexConfigurationAccountId()).toBe('account-b');
    expect(store.codexConfiguration()?.usage?.windows[0]?.usedPercent).toBe(20);
    expect(store.codexConfigurationBusy()).toBe(false);
  });

  it('invalidates in-flight account results when workspace configuration is cleared', async () => {
    // arrange
    const pending = deferred<ResponsePayload<'codex.configuration.get'>>();
    const { store } = arrange(vi.fn(() => pending.promise));
    const refresh = store.refreshCodexConfiguration('account-a');

    // act
    store.clearCodexConfiguration();
    pending.resolve(configuration(70));
    const accepted = await refresh;

    // assert
    expect(accepted).toBe(false);
    expect(store.codexConfiguration()).toBeUndefined();
    expect(store.codexConfigurationAccountId()).toBeUndefined();
    expect(store.codexConfigurationBusy()).toBe(false);
  });

  it('keeps quota windows isolated by account and ignores superseded requests for the same account', async () => {
    // arrange
    const firstA = deferred<ResponsePayload<'codex.configuration.get'>>();
    const secondA = deferred<ResponsePayload<'codex.configuration.get'>>();
    const firstB = deferred<ResponsePayload<'codex.configuration.get'>>();
    const request = vi
      .fn()
      .mockImplementationOnce(() => firstA.promise)
      .mockImplementationOnce(() => secondA.promise)
      .mockImplementationOnce(() => firstB.promise);
    const { store } = arrange(request);
    const oldA = store.refreshAiUsage({ connectionId: 'a', provider: 'codex' });
    const newA = store.refreshAiUsage({ connectionId: 'a', provider: 'codex' });
    const accountB = store.refreshAiUsage({ connectionId: 'b', provider: 'codex' });

    // act
    firstA.resolve(configuration(90));
    const stale = await oldA;
    const stillBusy = store.aiUsageBusyFor('a');
    firstB.resolve(configuration(40));
    await accountB;
    secondA.resolve(configuration(10));
    await newA;

    // assert
    expect(stale).toBe(false);
    expect(stillBusy).toBe(true);
    expect(store.aiUsageFor('a')?.[0]?.usedPercent).toBe(10);
    expect(store.aiUsageFor('b')?.[0]?.usedPercent).toBe(40);
    expect(store.aiUsageBusyFor('a')).toBe(false);
    expect(store.aiUsageBusyFor('b')).toBe(false);
  });

  it('does not issue a Codex usage request for another provider', async () => {
    // arrange
    const request = vi.fn(async () => configuration(30));
    const { store } = arrange(request);

    // act
    const refreshed = await store.refreshAiUsage({
      connectionId: 'claude-account',
      provider: 'claude',
    });

    // assert
    expect(refreshed).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(store.aiUsageFor('claude-account')).toEqual([]);
  });

  it('prevents overlapping login requests and releases feature-owned activity after failure', async () => {
    // arrange
    const pending = deferred<ResponsePayload<'claude.login.start'>>();
    const request = vi.fn(() => pending.promise);
    const { store, notifications, refreshProviderConnections } = arrange(request);
    const first = store.connectClaude('account-a');

    // act
    const duplicate = await store.connectClaude('account-b');
    pending.reject(new Error('Sign-in failed'));
    const accepted = await first;

    // assert
    expect(duplicate).toBe(false);
    expect(accepted).toBe(false);
    expect(request).toHaveBeenCalledExactlyOnceWith('claude.login.start', {
      accountId: 'account-a',
    });
    expect(store.connectionBusy()).toBe(false);
    expect(refreshProviderConnections).not.toHaveBeenCalled();
    expect(notifications.showError).toHaveBeenCalledOnce();
  });
});
