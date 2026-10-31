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
import {
  SettingsAlertService,
  SettingsEditorService,
  SettingsHostSession,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import type { IWorkspaceConfiguration } from '../ports/IWorkspaceConfiguration';
import { WORKSPACE_PATH_SELECTOR } from '../ports/WorkspacePathSelectorToken';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { WorkspaceSelectionStore } from '../state/WorkspaceSelectionStore';
import { WorkspaceStore } from '../state/WorkspaceStore';
import { WorkspaceSettingsViewPresenter } from './WorkspaceSettingsViewPresenter';

// #endregion

function arrange() {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto>({
    ...initial,
    workspaces: ['a', 'b'].map((id) => ({
      id,
      displayName: id,
      shortCode: id,
      color: '#123456',
      enabled: true,
      isolation: 'strict',
      storageLimitGiB: 20,
      localCiEnabled: false,
      automaticDeliveryGroupingEnabled: false,
    })),
  });
  const configurationBusy = signal(false);
  const saveSettings = vi.fn<IWorkspaceConfiguration['saveSettings']>(async () => true);
  const confirm = vi.fn<SettingsAlertService['confirm']>(async () => true);
  const deleteWorkspace = vi.fn(async () => undefined);
  TestBed.configureTestingModule({
    providers: [
      SettingsHostSession,
      WorkspaceSettingsViewPresenter,
      {
        provide: WORKSPACE_SETTINGS_CONTEXT,
        useValue: { settings, configurationBusy, storageStatus: signal(undefined) },
      },
      { provide: WORKSPACE_CONFIGURATION, useValue: { saveSettings } },
      { provide: WORKSPACE_PATH_SELECTOR, useValue: {} },
      { provide: SettingsAlertService, useValue: { confirm } },
      { provide: SettingsEditorService, useValue: {} },
      { provide: WorkspaceSelectionStore, useValue: {} },
      { provide: WorkspaceStore, useValue: { deleteWorkspace } },
    ],
  });
  const session = TestBed.inject(SettingsHostSession);
  session.openWorkspace('a', 'administration');
  const presenter = TestBed.inject(WorkspaceSettingsViewPresenter);
  TestBed.tick();
  return {
    presenter,
    session,
    settings,
    configurationBusy,
    saveSettings,
    confirm,
    deleteWorkspace,
  };
}

describe('WorkspaceSettingsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shows the stored limit of the workspace the Settings window selects', () => {
    // arrange
    const { presenter, session, settings } = arrange();
    settings.update((current) => ({
      ...current,
      workspaces: current.workspaces.map((item) =>
        item.id === 'b' ? { ...item, storageLimitGiB: 81 } : item,
      ),
    }));

    // act
    session.openWorkspace('b', 'administration');

    // assert
    expect(presenter.storageLimit()).toBe(81);
  });

  it('ignores reflected grouping events and excludes changes while the shared writer is busy', async () => {
    // arrange
    const { presenter, configurationBusy, saveSettings } = arrange();
    presenter.setAutomaticDeliveryGroupingCommand.execute(['a', false]);
    configurationBusy.set(true);

    // act
    presenter.setAutomaticDeliveryGroupingCommand.execute(['a', true]);

    // assert
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('saves a committed limit into the current aggregate and ignores values outside 2 to 1024 GB', async () => {
    // arrange
    const { presenter, settings, saveSettings } = arrange();

    // act
    presenter.commitWorkspaceStorageLimitCommand.execute(Number.NaN);
    presenter.commitWorkspaceStorageLimitCommand.execute(4096);
    presenter.commitWorkspaceStorageLimitCommand.execute(37);
    await Promise.resolve();

    // assert
    expect(saveSettings).toHaveBeenCalledTimes(1);
    const saved = saveSettings.mock.calls[0]?.[0];
    expect(saved?.workspaces.map((item) => item.storageLimitGiB)).toEqual([37, 20]);
    expect(saved?.runtime).toEqual(settings().runtime);
  });

  it('shows the stored limit again when saving a committed limit fails', async () => {
    // arrange
    const { presenter, saveSettings } = arrange();
    saveSettings.mockResolvedValueOnce(false);

    // act
    presenter.commitWorkspaceStorageLimitCommand.execute(37);
    const optimistic = presenter.storageLimit();
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve));

    // assert
    expect(optimistic).toBe(37);
    expect(presenter.storageLimit()).toBe(20);
  });

  it('saves delivery grouping as soon as it changes', async () => {
    // arrange
    const { presenter, saveSettings } = arrange();

    // act
    presenter.setAutomaticDeliveryGroupingCommand.execute(['a', true]);
    await Promise.resolve();

    // assert
    expect(presenter.automaticDeliveryGrouping()).toBe(true);
    expect(
      saveSettings.mock.calls[0]?.[0].workspaces.map(
        (item) => item.automaticDeliveryGroupingEnabled,
      ),
    ).toEqual([true, false]);
  });

  it('deletes a workspace only after its alert sheet is confirmed', async () => {
    // arrange
    const { presenter, settings, confirm, deleteWorkspace } = arrange();
    const workspace = settings().workspaces[0]!;
    confirm.mockResolvedValueOnce(false);

    // act
    presenter.confirmDeleteWorkspaceCommand.execute(workspace);
    await Promise.resolve();
    presenter.confirmDeleteWorkspaceCommand.execute(workspace);
    await vi.waitFor(() => expect(deleteWorkspace).toHaveBeenCalled());

    // assert
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delete-workspace-confirmation-a',
        header: 'Delete a?',
        confirmLabel: 'Delete workspace',
        cancelLabel: 'Keep workspace',
        destructive: true,
      }),
    );
    expect(deleteWorkspace).toHaveBeenCalledTimes(1);
    expect(deleteWorkspace).toHaveBeenCalledWith('a');
  });
});
