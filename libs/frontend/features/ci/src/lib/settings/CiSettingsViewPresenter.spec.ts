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
import { SettingsAlertService, SettingsHostSession } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { Subject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CI_RUNTIME_WORKSPACE_ROOT } from '../ports/CiRuntimeWorkspaceRootToken';
import { CI_SETTINGS_CONFIGURATION } from '../ports/CiSettingsConfigurationToken';
import type { ICiSettingsConfiguration } from '../ports/ICiSettingsConfiguration';
import { CI_SETTINGS_CONTEXT } from '../ports/CiSettingsContextToken';
import { CiStore } from '../state/CiStore';
import { CiSettingsViewPresenter } from './CiSettingsViewPresenter';

// #endregion

describe('CiSettingsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('retains one unsaved machine, workspace and script draft across card remounts in the Settings session', () => {
    // arrange
    const { presenter, session } = arrange();
    presenter.updateLocalCiReuseCommand.execute(true);
    presenter.updateWorkspaceLocalCiCommand.execute(['personal', true]);
    presenter.updateSetupScriptCommand.execute(['repository-personal', 'echo retained']);

    // act
    session.openWorkspace('second', 'local-ci');
    const remounted = TestBed.runInInjectionContext(() => new CiSettingsViewPresenter());
    TestBed.tick();

    // assert
    expect(remounted.localCi).toBe(presenter.localCi);
    expect(remounted.localCi().reuseVirtualMachine).toBe(true);
    expect(remounted.workspaceLocalCiEnabled()('personal')).toBe(true);
    expect(remounted.setupScript()('repository-personal')).toBe('echo retained');
    expect(remounted.workspace()?.id).toBe('second');
  });

  it('keeps a newer machine change when the stored settings of an earlier save arrive', () => {
    // arrange
    const { presenter, settings } = arrange();
    const stored = settings()!;
    presenter.localCi.set({ ...stored.localCi, storageLimitGiB: 40 });
    TestBed.tick();
    presenter.localCi.set({ ...stored.localCi, storageLimitGiB: 48 });

    // act
    settings.set({ ...stored, localCi: { ...stored.localCi, storageLimitGiB: 40 } });
    TestBed.tick();
    const afterEarlierSave = presenter.localCi().storageLimitGiB;
    settings.set({ ...stored, localCi: { ...stored.localCi, storageLimitGiB: 48 } });
    TestBed.tick();
    settings.set({ ...stored, localCi: { ...stored.localCi, storageLimitGiB: 56 } });
    TestBed.tick();

    // assert
    expect(afterEarlierSave).toBe(48);
    expect(presenter.localCi().storageLimitGiB).toBe(56);
  });

  it('saves a workspace activation as soon as it changes, only for that workspace', async () => {
    // arrange
    const { presenter, saveSettings, settings } = arrange();

    // act
    presenter.updateWorkspaceLocalCiCommand.execute(['personal', true]);
    await Promise.resolve();

    // assert
    expect(saveSettings).toHaveBeenCalledTimes(1);
    const saved = saveSettings.mock.calls[0]![0];
    expect(saved.workspaces.map((workspace) => workspace.localCiEnabled)).toEqual([true, false]);
    expect(saved.repositoryBindings).toBe(settings()!.repositoryBindings);
    expect(saved.runtime).toBe(settings()!.runtime);
  });

  it('shows the stored activation again when saving it fails', async () => {
    // arrange
    const { presenter, saveSettings } = arrange();
    saveSettings.mockResolvedValueOnce(false);

    // act
    presenter.updateWorkspaceLocalCiCommand.execute(['personal', true]);
    const optimistic = presenter.workspaceLocalCiEnabled()('personal');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    await Promise.resolve();

    // assert
    expect(optimistic).toBe(true);
    expect(presenter.workspaceLocalCiEnabled()('personal')).toBe(false);
  });

  it('saves a trimmed setup script on commit, removes an empty one and skips unchanged scripts', async () => {
    // arrange
    const { presenter, saveSettings, settings } = arrange();

    // act
    presenter.updateSetupScriptCommand.execute(['repository-personal', '  original personal  ']);
    presenter.commitSetupScriptCommand.execute('repository-personal');
    presenter.updateSetupScriptCommand.execute(['repository-personal', '  echo ready  ']);
    presenter.commitSetupScriptCommand.execute('repository-personal');
    await Promise.resolve();
    const first = saveSettings.mock.calls[0]![0];
    settings.set(first);
    TestBed.tick();
    presenter.updateSetupScriptCommand.execute(['repository-personal', '   ']);
    presenter.commitSetupScriptCommand.execute('repository-personal');
    await Promise.resolve();

    // assert
    expect(saveSettings).toHaveBeenCalledTimes(2);
    expect(first.repositoryBindings.map((repository) => repository.localCiSetupScript)).toEqual([
      'echo ready',
      'original second',
    ]);
    expect(first.workspaces).toEqual(settings()!.workspaces);
    expect(saveSettings.mock.calls[1]![0].repositoryBindings[0]).not.toHaveProperty(
      'localCiSetupScript',
    );
  });

  it('restores the stored setup script when saving it fails', async () => {
    // arrange
    const { presenter, saveSettings } = arrange();
    saveSettings.mockResolvedValueOnce(false);

    // act
    presenter.updateSetupScriptCommand.execute(['repository-personal', 'echo lost']);
    presenter.commitSetupScriptCommand.execute('repository-personal');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    await Promise.resolve();

    // assert
    expect(presenter.setupScript()('repository-personal')).toBe('original personal');
  });

  it('reads the authoritative runtime root before the one shared optional draft fallback', () => {
    // arrange
    const { presenter, settings, workspaceRoot } = arrange();
    const authoritativeRoot = settings()!.runtime.workspaceRoot.replace(/[\\/]+$/u, '');

    // act
    const persisted = presenter.localCiRuntimeRoot();
    settings.set(undefined);
    workspaceRoot.set('/draft/workspaces/');
    const fallback = presenter.localCiRuntimeRoot();

    // assert
    expect(persisted).toBe(`${authoritativeRoot}/local-ci`);
    expect(fallback).toBe('/draft/workspaces/local-ci');
  });

  it('requires a positive existing confirmation before removing a native machine', async () => {
    // arrange
    const { presenter, decisions, store } = arrange();

    // act
    presenter.confirmRemoveLocalCiInstanceCommand.execute('machine');
    decisions[0]!.next({ reason: 'negative' });
    decisions[0]!.complete();
    presenter.confirmRemoveLocalCiInstanceCommand.execute('machine');
    decisions[1]!.next({ reason: 'positive' });
    decisions[1]!.complete();
    await vi.waitFor(() => expect(store.removeLocalCiInstance).toHaveBeenCalled());

    // assert
    expect(store.removeLocalCiInstance).toHaveBeenCalledExactlyOnceWith('machine');
  });

  it('polls measured capacity every five seconds and cancels its timer during a pending refresh on disposal', async () => {
    // arrange
    const { configuration } = arrange();
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    configuration.refreshStorageStatus.mockImplementation(() => pending);

    // act
    vi.advanceTimersByTime(5_000);
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(15_000);
    finish?.();
    await pending;

    // assert
    expect(configuration.refreshStorageStatus).toHaveBeenCalledExactlyOnceWith(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

function arrange() {
  vi.useFakeTimers();
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/test'));
  const personal = initial.workspaces[0]!;
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...initial,
    workspaces: [personal, { ...personal, id: 'second', displayName: 'Second', shortCode: 'S' }],
    repositoryBindings: ['personal', 'second'].map(
      (workspaceId): ApplicationSettingsDto['repositoryBindings'][number] => ({
        id: `repository-${workspaceId}`,
        workspaceId,
        sourceControlConnectionId: `source-${workspaceId}`,
        displayName: workspaceId,
        provider: 'github',
        host: 'github.com',
        owner: 'owner',
        name: workspaceId,
        defaultBranch: 'main',
        localPath: `/test/${workspaceId}`,
        enabled: true,
        localCiSetupScript: `original ${workspaceId}`,
      }),
    ),
  });
  const configurationBusy = signal(false);
  const workspaceRoot = signal('/draft/fallback');
  const saveSettings = vi.fn<ICiSettingsConfiguration['saveSettings']>(async () => true);
  const configuration = {
    saveSettings,
    refreshConfiguration: vi.fn(async () => undefined),
    refreshStorageStatus: vi.fn<ICiSettingsConfiguration['refreshStorageStatus']>(
      async () => undefined,
    ),
  };
  const store = {
    runnerImageCatalog: signal({ entries: [], selections: [] }),
    runnerImageBusy: signal(false),
    localCiInstances: signal({ instances: [] }),
    localCiInstancesBusy: signal(false),
    localCiRunningRunId: signal(undefined),
    localCiInstanceRemoving: signal(undefined),
    localCiCleanupBusy: signal(false),
    refreshRunnerImages: vi.fn(async () => undefined),
    refreshLocalCiInstances: vi.fn(async () => undefined),
    selectRunnerImage: vi.fn(async () => undefined),
    removeLocalCiInstance: vi.fn(async () => true),
    clearLocalCiData: vi.fn(async () => true),
  };
  const decisions: Subject<{ reason: 'positive' | 'negative' }>[] = [];
  TestBed.configureTestingModule({
    providers: [
      CiSettingsViewPresenter,
      SettingsHostSession,
      {
        provide: CI_SETTINGS_CONTEXT,
        useValue: {
          settings,
          configurationBusy,
          editorBusy: signal(false),
          storageStatus: signal(undefined),
        },
      },
      { provide: CI_SETTINGS_CONFIGURATION, useValue: configuration },
      { provide: CI_RUNTIME_WORKSPACE_ROOT, useValue: workspaceRoot },
      { provide: CiStore, useValue: store },
      {
        provide: SettingsAlertService,
        useValue: {
          confirm: vi.fn(
            () =>
              new Promise<boolean>((resolve) => {
                const closed = new Subject<{ reason: 'positive' | 'negative' }>();
                decisions.push(closed);
                closed.subscribe((decision) => resolve(decision.reason === 'positive'));
              }),
          ),
        },
      },
    ],
  });
  const session = TestBed.inject(SettingsHostSession);
  session.openWorkspace('personal', 'local-ci');
  const presenter = TestBed.inject(CiSettingsViewPresenter);
  TestBed.tick();
  return {
    presenter,
    session,
    settings,
    workspaceRoot,
    saveSettings,
    configuration,
    store,
    decisions,
  };
}
