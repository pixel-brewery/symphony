// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { SettingsEditorService, SettingsHostSession } from '@symphony/frontend-setting';
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
      { provide: MessageBoxService, useValue: {} },
      { provide: SettingsEditorService, useValue: {} },
      { provide: WorkspaceSelectionStore, useValue: {} },
      { provide: WorkspaceStore, useValue: {} },
    ],
  });
  const session = TestBed.inject(SettingsHostSession);
  session.openWorkspace('a', 'administration');
  const presenter = TestBed.inject(WorkspaceSettingsViewPresenter);
  TestBed.tick();
  return { presenter, session, settings, configurationBusy, saveSettings };
}

describe('WorkspaceSettingsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('retains independent unsaved limits across workspace switches and card remounts within one Settings route', () => {
    // arrange
    const { presenter, session } = arrange();
    presenter.updateWorkspaceStorageLimitCommand.execute(37);

    // act
    session.openWorkspace('b', 'administration');
    presenter.updateWorkspaceStorageLimitCommand.execute(81);
    const remounted = TestBed.runInInjectionContext(() => new WorkspaceSettingsViewPresenter());
    TestBed.tick();
    const limitB = remounted.storageLimit();
    session.openWorkspace('a', 'administration');

    // assert
    expect(limitB).toBe(81);
    expect(remounted.storageLimit()).toBe(37);
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

  it('persists only the requested limit into the current aggregate while rejecting nonfinite input', () => {
    // arrange
    const { presenter, settings, saveSettings } = arrange();
    presenter.updateWorkspaceStorageLimitCommand.execute(37);
    presenter.updateWorkspaceStorageLimitCommand.execute(Number.NaN);

    // act
    presenter.saveWorkspaceStorageLimitCommand.execute();

    // assert
    const saved = saveSettings.mock.calls[0]?.[0];
    expect(saved?.workspaces.map((item) => item.storageLimitGiB)).toEqual([37, 20]);
    expect(saved?.runtime).toEqual(settings().runtime);
  });
});
