// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { ApplicationRef, ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  MessageBoxService,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { Subject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AiStore } from '../state/AiStore';
import { AiAccountSettingsEditorViewPresenter } from './AiAccountSettingsEditorViewPresenter';

// #endregion

function arrange(nativeInstallAvailable = true, runtimeAvailable = true) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({ ...initial, connections: [] });
  const saveSettings = vi.fn<AiStore['saveSettings']>(async (next) => {
    settings.set(next);
    return true;
  });
  const connectCodex = vi.fn<AiStore['connectCodex']>(async () => true);
  const refreshProviderConnections = vi.fn(async () => undefined);
  const installRuntimeDependency = vi.fn<AiStore['installRuntimeDependency']>(async () => false);
  const confirmation = new Subject<{ reason: 'positive' }>();
  const show = vi.fn(() => ({ closed: confirmation }));
  const context: Pick<
    AiStore,
    | 'nativeInstallAvailable'
    | 'installRuntimeDependency'
    | 'settings'
    | 'configurationBusy'
    | 'editorBusy'
    | 'connections'
    | 'runtimeHealth'
    | 'runtimeDependencyInstallBusy'
    | 'saveSettings'
    | 'synchronizeDeliveryContext'
    | 'refreshConfiguration'
    | 'refreshProviderConnections'
    | 'connectCodex'
  > = {
    nativeInstallAvailable,
    installRuntimeDependency,
    settings,
    configurationBusy: signal(false),
    editorBusy: signal(false),
    connections: signal<ResponsePayload<'connections.get'> | undefined>(undefined),
    runtimeHealth: signal<ResponsePayload<'health.get'> | undefined>({
      status: 'ready',
      utilityProcess: true,
      database: true,
      homebrew: { available: true },
      git: { available: true },
      githubCli: { available: true },
      agents: {
        codex: { available: runtimeAvailable },
        claude: { available: runtimeAvailable },
        opencode: { available: runtimeAvailable },
      },
    }),
    runtimeDependencyInstallBusy: signal(undefined),
    saveSettings,
    synchronizeDeliveryContext: (value) => value,
    refreshConfiguration: async () => undefined,
    refreshProviderConnections,
    connectCodex,
  };
  const closed = new Subject<void>();
  const close = vi.fn(() => closed.next());
  TestBed.configureTestingModule({
    providers: [
      AiAccountSettingsEditorViewPresenter,
      { provide: AiStore, useValue: context },
      {
        provide: DRAWER_REF_DATA,
        useValue: { kind: 'ai-account', workspaceId: 'workspace-a', runtime: 'codex' },
      },
      { provide: DRAWER_REF, useValue: { closed, close } },
      { provide: ApplicationRef, useValue: { tick: vi.fn() } },
      { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
      { provide: MessageBoxService, useValue: { show } },
    ],
  });
  return {
    presenter: TestBed.inject(AiAccountSettingsEditorViewPresenter),
    settings,
    saveSettings,
    connectCodex,
    refreshProviderConnections,
    closed,
    close,
    show,
    confirmation,
    installRuntimeDependency,
  };
}

describe('AiAccountSettingsEditorViewPresenter', () => {
  it.each([false, true])(
    'requires the actual Platform owner before confirming native installation: %s',
    async (nativeInstallAvailable) => {
      // arrange
      const { presenter, show, confirmation, installRuntimeDependency } = arrange(
        nativeInstallAvailable,
        false,
      );

      // act
      presenter.confirmInstallAiRuntimeCommand.execute(['codex', 'Codex']);
      if (nativeInstallAvailable) confirmation.next({ reason: 'positive' });
      await Promise.resolve();

      // assert
      expect(presenter.confirmInstallAiRuntimeCommand.canExecute()).toBe(nativeInstallAvailable);
      expect(show).toHaveBeenCalledTimes(nativeInstallAvailable ? 1 : 0);
      expect(installRuntimeDependency).toHaveBeenCalledTimes(nativeInstallAvailable ? 1 : 0);
    },
  );

  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('waits for an in-flight failed sign-in before removing only the provisional account on close', async () => {
    // arrange
    const { presenter, settings, saveSettings, connectCodex, closed } = arrange();
    let finish: (value: boolean) => void = () => {
      throw new Error('Login did not start.');
    };
    connectCodex.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    await presenter.onHydrate();
    presenter.connectAiAccountCommand.execute();
    await vi.waitFor(() => expect(connectCodex).toHaveBeenCalledOnce());
    const pendingId = presenter.aiAccountId();

    // act
    closed.next();
    await Promise.resolve();
    const savesBeforeLoginSettled = saveSettings.mock.calls.length;
    finish(false);
    await vi.waitFor(() => expect(presenter.aiAccountId()).toBeUndefined());

    // assert
    expect(savesBeforeLoginSettled).toBe(1);
    expect(pendingId).toBeTruthy();
    expect(settings()?.connections).toEqual([]);
    expect(saveSettings).toHaveBeenCalledTimes(2);
    expect(presenter.busy()).toBe(false);
  });

  it('retains a completed API-key account and clears its draft secret when the drawer closes', async () => {
    // arrange
    const { presenter, settings, saveSettings, connectCodex, closed } = arrange();
    await presenter.onHydrate();
    presenter.aiAccount.loginMethod = 'api-key';
    presenter.aiAccount.apiKey = 'test-only-key';

    // act
    presenter.connectAiAccountCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));
    closed.next();
    await Promise.resolve();

    // assert
    expect(connectCodex).toHaveBeenCalledWith({
      mode: 'api-key',
      accountId: presenter.aiAccountId(),
      apiKey: 'test-only-key',
    });
    expect(presenter.aiAccount.apiKey).toBe('');
    expect(settings()?.connections).toHaveLength(1);
    expect(saveSettings).toHaveBeenCalledOnce();
  });

  it('disposes the browser sign-in poll with the owning drawer lifecycle', async () => {
    // arrange
    const { presenter, refreshProviderConnections } = arrange();
    vi.useFakeTimers();
    await presenter.onHydrate();
    presenter.connectAiAccountCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // act
    presenter.dispose();
    await vi.advanceTimersByTimeAsync(9_000);

    // assert
    expect(refreshProviderConnections).toHaveBeenCalledOnce();
  });
});
