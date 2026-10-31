// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { SettingsHostSession } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IAutomationSettingsContext } from '../ports/IAutomationSettingsContext';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { StorageSafetySettingsViewPresenter } from './StorageSafetySettingsViewPresenter';

// #endregion

function arrange(saved = true) {
  const initial = applicationSettingsSchema.parse(
    createDefaultApplicationSettings('/tmp/symphony'),
  );
  const settings = signal<ApplicationSettingsDto | undefined>(initial);
  const refreshStorageStatus = vi
    .fn<IAutomationSettingsContext['refreshStorageStatus']>()
    .mockResolvedValue(undefined);
  const saveSettings = vi
    .fn<IAutomationSettingsContext['saveSettings']>()
    .mockImplementation(async (next) => {
      if (saved) settings.set(next);
      return saved;
    });
  const context: IAutomationSettingsContext = {
    settings,
    configurationBusy: signal(false),
    storageStatus: signal(undefined),
    workspaceCleanupAvailable: true,
    refreshStorageStatus,
    refreshConfiguration: async () => undefined,
    saveSettings,
    unpreparedAutomaticRepositories: () => [],
    clearWorkspaces: async () => true,
  };
  TestBed.configureTestingModule({
    providers: [
      SettingsHostSession,
      StorageSafetySettingsViewPresenter,
      { provide: AUTOMATION_SETTINGS_CONTEXT, useValue: context },
    ],
  });
  return {
    initial,
    refreshStorageStatus,
    saveSettings,
    presenter: TestBed.inject(StorageSafetySettingsViewPresenter),
    session: TestBed.inject(SettingsHostSession),
  };
}

describe('StorageSafetySettingsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('preserves bounded silent measurement refresh and cancels it with the mounted card', async () => {
    // arrange
    const { presenter, refreshStorageStatus } = arrange();

    // act
    await vi.advanceTimersByTimeAsync(5_000);

    // assert
    expect(refreshStorageStatus).toHaveBeenCalledExactlyOnceWith(true);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(refreshStorageStatus).toHaveBeenCalledOnce();
    expect(presenter.disposed()).toBe(true);
  });

  it('saves a committed limit at once into the matching settings field', async () => {
    // arrange
    const { initial, presenter, saveSettings } = arrange();

    // act
    presenter.commitLimitCommand.execute([presenter.localCiLimit, { target: { value: '40' } }]);
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());

    // assert
    expect(saveSettings).toHaveBeenCalledWith({
      ...initial,
      localCi: { ...initial.localCi, storageLimitGiB: 40 },
    });
    expect(presenter.localCiLimit.setting.value()).toBe(40);
  });

  it('rejects an out-of-range value and restores the stored limit after a failed save', async () => {
    // arrange
    const { initial, presenter, saveSettings } = arrange(false);

    // act
    presenter.commitLimitCommand.execute([presenter.managedLimit, 4]);
    presenter.commitLimitCommand.execute([presenter.minimumFreeDisk, 30]);
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(presenter.minimumFreeDisk.setting.value()).toBe(initial.runtime.minimumFreeDiskGiB),
    );

    // assert
    expect(presenter.managedLimit.setting.value()).toBe(initial.runtime.managedStorageLimitGiB);
  });

  it('opens a workspace’s Administration from the workspace share', () => {
    // arrange
    const { initial, presenter, session } = arrange();
    const workspaceId = initial.workspaces[0]!.id;

    // act
    presenter.openWorkspaceAdministrationCommand.execute(workspaceId);

    // assert
    expect(session.workspaceId()).toBe(workspaceId);
    expect(session.workspaceSection()).toBe('administration');
    expect(presenter.workspaceShares()[0]).toMatchObject({
      id: workspaceId,
      allocatedBytes: undefined,
      limitGiB: initial.workspaces[0]!.storageLimitGiB,
    });
  });
});
