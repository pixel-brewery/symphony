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
import { SettingsHostSession } from '@symphony/frontend-setting';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IAutomationSettingsContext } from '../ports/IAutomationSettingsContext';
import type { IAutomationPathSelector } from '../ports/IAutomationPathSelector';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { AUTOMATION_PATH_SELECTOR } from '../ports/AutomationPathSelectorToken';
import { AutomationSettingsStore } from '../state/AutomationSettingsStore';
import { StorageSafetySettingsViewPresenter } from './StorageSafetySettingsViewPresenter';

// #endregion

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
    const refreshStorageStatus = vi
      .fn<IAutomationSettingsContext['refreshStorageStatus']>()
      .mockResolvedValue(undefined);
    const context: IAutomationSettingsContext = {
      settings: signal(
        applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp/symphony')),
      ),
      configurationBusy: signal(false),
      storageStatus: signal(undefined),
      workspaceCleanupAvailable: true,
      refreshStorageStatus,
      refreshConfiguration: async () => undefined,
      saveSettings: async () => true,
      unpreparedAutomaticRepositories: () => [],
      clearWorkspaces: async () => true,
    };
    const paths: IAutomationPathSelector = {
      selectPath: async () => ({ canceled: true, paths: [] }),
    };
    TestBed.configureTestingModule({
      providers: [
        SettingsHostSession,
        AutomationSettingsStore,
        StorageSafetySettingsViewPresenter,
        { provide: AUTOMATION_SETTINGS_CONTEXT, useValue: context },
        { provide: AUTOMATION_PATH_SELECTOR, useValue: paths },
        { provide: MessageBoxService, useValue: {} },
      ],
    });
    const presenter = TestBed.inject(StorageSafetySettingsViewPresenter);

    // act
    await vi.advanceTimersByTimeAsync(5_000);

    // assert
    expect(refreshStorageStatus).toHaveBeenCalledExactlyOnceWith(true);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(refreshStorageStatus).toHaveBeenCalledOnce();
    expect(presenter.disposed()).toBe(true);
  });
});
