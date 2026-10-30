// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { OrchestrationState } from '@symphony/frontend-core/testing/orchestration';
import { NotificationService } from '@symphony/frontend-notification';
import { SettingsHostSession } from '@symphony/frontend-setting';
import type {
  ApplicationSettingsDto,
  IOrchestrationApi,
} from '@symphony/ipc-contracts-composition';
import type { PathSelectionResponse } from '@symphony/ipc-contracts-desktop';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IAutomationSettingsContext } from '../ports/IAutomationSettingsContext';
import type { IAutomationPathSelector } from '../ports/IAutomationPathSelector';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { AUTOMATION_PATH_SELECTOR } from '../ports/AutomationPathSelectorToken';
import { provideAutomationFeature } from '../provider/provideAutomationFeature';
import { AutomationPolicySettingsViewPresenter } from '../settings/AutomationPolicySettingsViewPresenter';
import { StorageSafetySettingsViewPresenter } from '../settings/StorageSafetySettingsViewPresenter';
import { AutomationSettingsStore } from './AutomationSettingsStore';

// #endregion

function settings() {
  return applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp/symphony'));
}

function arrange(
  selectPath: IAutomationPathSelector['selectPath'] = async () => ({ canceled: true, paths: [] }),
) {
  const authoritative = signal<ApplicationSettingsDto | undefined>(settings());
  const saveSettings = vi.fn<IAutomationSettingsContext['saveSettings']>().mockResolvedValue(true);
  const context: IAutomationSettingsContext = {
    settings: authoritative,
    configurationBusy: signal(false),
    storageStatus: signal(undefined),
    workspaceCleanupAvailable: true,
    saveSettings,
    refreshConfiguration: async () => undefined,
    refreshStorageStatus: async () => undefined,
    unpreparedAutomaticRepositories: () => [],
    clearWorkspaces: async () => true,
  };
  const paths: IAutomationPathSelector = { selectPath };
  TestBed.configureTestingModule({
    providers: [
      AutomationSettingsStore,
      { provide: AUTOMATION_SETTINGS_CONTEXT, useValue: context },
      { provide: AUTOMATION_PATH_SELECTOR, useValue: paths },
      { provide: MessageBoxService, useValue: {} },
    ],
  });
  const store = TestBed.inject(AutomationSettingsStore);
  store.beginSession(new SettingsHostSession());
  TestBed.tick();
  return { store, authoritative, saveSettings };
}

describe('AutomationSettingsStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares one unsaved policy between real Automation and Storage cards and resets for a new route', () => {
    // arrange
    const client: IOrchestrationApi = {
      request: async () => {
        throw new Error('Unexpected native request.');
      },
      selectPath: async () => ({ canceled: true, paths: [] }),
      onExecutionEvent: () => () => undefined,
    };
    TestBed.configureTestingModule({
      providers: [
        provideAutomationFeature(),
        SettingsHostSession,
        { provide: ORCHESTRATION_CLIENT, useValue: client },
        {
          provide: NotificationService,
          useValue: { showError: vi.fn(), showSuccess: vi.fn(), showWarning: vi.fn() },
        },
        { provide: MessageBoxService, useValue: {} },
      ],
    });
    const initial = settings();
    TestBed.inject(OrchestrationState).settings.set(initial);
    const policy = TestBed.runInInjectionContext(() => new AutomationPolicySettingsViewPresenter());
    TestBed.tick();
    policy.runtime.update((runtime) => ({ ...runtime, workspaceRoot: '/unsaved/root' }));

    // act
    const storage = TestBed.runInInjectionContext(() => new StorageSafetySettingsViewPresenter());
    storage.updateRuntimeNumberCommand.execute([
      'managedStorageLimitGiB',
      { detail: { value: '83' } },
    ]);
    const remounted = TestBed.runInInjectionContext(
      () => new AutomationPolicySettingsViewPresenter(),
    );
    TestBed.tick();

    // assert
    expect(storage.runtime).toBe(policy.runtime);
    expect(remounted.runtime()).toMatchObject({
      workspaceRoot: '/unsaved/root',
      managedStorageLimitGiB: 83,
    });
    const store = TestBed.inject(AutomationSettingsStore);
    expect(store.workspaceRoot()).toBe('/unsaved/root');
    store.beginSession(new SettingsHostSession());
    expect(store.runtime()).toEqual(initial.runtime);
  });

  it('reconciles authoritative settings into the same signal after local policy edits', () => {
    // arrange
    const { store, authoritative } = arrange();
    const runtime = store.runtime;
    store.updateRuntimeNumberCommand.execute(['maxParallelExecutions', 9]);
    const updated = settings();

    // act
    authoritative.set({ ...updated, runtime: { ...updated.runtime, maxParallelExecutions: 6 } });
    TestBed.tick();

    // assert
    expect(store.runtime).toBe(runtime);
    expect(store.runtime().maxParallelExecutions).toBe(6);
  });

  it('omits cleanup and rejects its command when the actual Workspace contribution is absent', async () => {
    // arrange
    const showConfirmation = vi.fn();
    const client: IOrchestrationApi = {
      request: async () => {
        throw new Error('An omitted Workspace must not receive a request.');
      },
      selectPath: async () => ({ canceled: true, paths: [] }),
      onExecutionEvent: () => () => undefined,
    };
    TestBed.configureTestingModule({
      providers: [
        provideAutomationFeature(),
        SettingsHostSession,
        { provide: ORCHESTRATION_CLIENT, useValue: client },
        {
          provide: NotificationService,
          useValue: { showError: vi.fn(), showSuccess: vi.fn(), showWarning: vi.fn() },
        },
        { provide: MessageBoxService, useValue: { show: showConfirmation } },
      ],
    });
    TestBed.inject(OrchestrationState).settings.set(settings());
    const context = TestBed.inject(AUTOMATION_SETTINGS_CONTEXT);
    const policy = TestBed.runInInjectionContext(() => new AutomationPolicySettingsViewPresenter());

    // act
    policy.confirmClearWorkspacesCommand.execute();
    const cleared = await context.clearWorkspaces();

    // assert
    expect(policy.workspaceCleanupAvailable).toBe(false);
    expect(policy.confirmClearWorkspacesCommand.canExecute()).toBe(false);
    expect(showConfirmation).not.toHaveBeenCalled();
    expect(cleared).toBe(false);
  });

  it('saves the complete shared policy through the existing writer while rejecting nonfinite edits', () => {
    // arrange
    const { store, authoritative, saveSettings } = arrange();
    store.updateRuntimeNumberCommand.execute(['managedStorageLimitGiB', 83]);
    store.updateRuntimeNumberCommand.execute(['minimumFreeDiskGiB', Number.NaN]);
    store.updateAgenticDeliveryNumberCommand.execute(['maxAttempts', 4.9]);
    store.updateAgenticDeliveryFlag('workflowRepairEnabled', true);

    // act
    store.saveRuntimeCommand.execute();

    // assert
    expect(saveSettings).toHaveBeenCalledExactlyOnceWith({
      ...authoritative(),
      runtime: {
        ...authoritative()?.runtime,
        managedStorageLimitGiB: 83,
        agenticDelivery: {
          ...authoritative()?.runtime.agenticDelivery,
          maxAttempts: 4,
          workflowRepairEnabled: true,
        },
      },
    });
    expect(store.runtime().minimumFreeDiskGiB).toBe(authoritative()?.runtime.minimumFreeDiskGiB);
  });

  it('keeps a completed native picker from changing a newer Settings route draft', async () => {
    // arrange
    let completeSelection: (value: PathSelectionResponse) => void = () => undefined;
    const pending = new Promise<PathSelectionResponse>((resolve) => {
      completeSelection = resolve;
    });
    const { store, authoritative } = arrange(() => pending);
    store.chooseWorkspaceRootCommand.execute();

    // act
    store.beginSession(new SettingsHostSession());
    completeSelection({ canceled: false, paths: ['/stale/settings-route'] });
    await Promise.resolve();

    // assert
    expect(store.runtime().workspaceRoot).toBe(authoritative()?.runtime.workspaceRoot);
  });
});
