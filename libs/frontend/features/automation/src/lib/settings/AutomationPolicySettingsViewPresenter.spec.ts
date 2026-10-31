// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { SettingsAlertService, SettingsHostSession } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AUTOMATION_PATH_SELECTOR } from '../ports/AutomationPathSelectorToken';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import type { IAutomationSettingsContext } from '../ports/IAutomationSettingsContext';
import { AutomationSettingsStore } from '../state/AutomationSettingsStore';
import { AutomationPolicySettingsViewPresenter } from './AutomationPolicySettingsViewPresenter';

// #endregion

function arrange(confirmed = true) {
  const authoritative = signal<ApplicationSettingsDto | undefined>(
    applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp/symphony')),
  );
  const saveSettings = vi
    .fn<IAutomationSettingsContext['saveSettings']>()
    .mockImplementation(async (next) => {
      authoritative.set(next);
      return true;
    });
  const clearWorkspaces = vi.fn(async () => true);
  const confirm = vi.fn(async () => confirmed);
  const context: IAutomationSettingsContext = {
    settings: authoritative,
    configurationBusy: signal(false),
    storageStatus: signal(undefined),
    workspaceCleanupAvailable: true,
    saveSettings,
    refreshConfiguration: async () => undefined,
    refreshStorageStatus: async () => undefined,
    unpreparedAutomaticRepositories: () => [],
    clearWorkspaces,
  };
  TestBed.configureTestingModule({
    providers: [
      AutomationSettingsStore,
      SettingsHostSession,
      { provide: AUTOMATION_SETTINGS_CONTEXT, useValue: context },
      {
        provide: AUTOMATION_PATH_SELECTOR,
        useValue: { selectPath: async () => ({ canceled: true, paths: [] }) },
      },
      { provide: SettingsAlertService, useValue: { confirm } },
    ],
  });
  const presenter = TestBed.runInInjectionContext(
    () => new AutomationPolicySettingsViewPresenter(),
  );
  TestBed.tick();
  return { presenter, authoritative, saveSettings, clearWorkspaces, confirm };
}

describe('AutomationPolicySettingsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('sets the switches of a chosen level and saves them at once', async () => {
    // arrange
    const { presenter, authoritative, saveSettings } = arrange();

    // act
    presenter.selectLevelCommand.execute('repair');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());

    // assert
    expect(presenter.agenticLevel()).toBe('repair');
    expect(authoritative()?.runtime.agenticDelivery).toMatchObject({
      enabled: true,
      observeFailures: true,
      aiDiagnosisEnabled: true,
      ciRerunEnabled: true,
      managedBranchUpdatesEnabled: true,
      sourceRepairEnabled: true,
      workflowRepairEnabled: true,
      replacementPullRequestEnabled: false,
    });
  });

  it('reads Custom after one switch changes and names the prerequisite of a disabled switch', async () => {
    // arrange
    const { presenter, saveSettings } = arrange();
    presenter.selectLevelCommand.execute('diagnose');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());

    // act
    presenter.setAgenticSwitchCommand.execute(['ciRerunEnabled', false]);
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledTimes(2));

    // assert
    expect(presenter.agenticLevel()).toBe('custom');
    expect(presenter.agenticBlocker()('sourceRepairEnabled')).toBe('managedBranchUpdatesEnabled');
    expect(presenter.agenticBlocker()('replacementPullRequestEnabled')).toBe('sourceRepairEnabled');
    expect(presenter.agenticBlocker()('aiDiagnosisEnabled')).toBeUndefined();
  });

  it('shows Custom when chosen without changing a switch', () => {
    // arrange
    const { presenter, saveSettings } = arrange();

    // act
    presenter.selectLevelCommand.execute('custom');

    // assert
    expect(presenter.agenticLevel()).toBe('custom');
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('applies a committed number within its bounds and ignores an empty entry', async () => {
    // arrange
    const { presenter, authoritative, saveSettings } = arrange();

    // act
    presenter.commitRuntimeNumberCommand.execute([
      'maxParallelExecutions',
      { target: { value: '99' } },
    ]);
    presenter.commitAgenticNumberCommand.execute(['maxAttempts', { target: { value: '' } }]);
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());

    // assert
    expect(authoritative()?.runtime.maxParallelExecutions).toBe(32);
  });

  it('clears inactive workspaces only after the alert sheet is confirmed', async () => {
    // arrange
    const declined = arrange(false);

    // act
    declined.presenter.confirmClearWorkspacesCommand.execute();
    await vi.waitFor(() => expect(declined.confirm).toHaveBeenCalledOnce());

    // assert
    expect(declined.clearWorkspaces).not.toHaveBeenCalled();
  });
});
