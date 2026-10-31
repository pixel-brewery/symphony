// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DRAWER_REF, DRAWER_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IWorkspaceSettingsContext } from '../ports/IWorkspaceSettingsContext';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import type { IWorkspaceConfiguration } from '../ports/IWorkspaceConfiguration';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { WorkspaceSettingsEditorViewPresenter } from './WorkspaceSettingsEditorViewPresenter';

// #endregion

function arrange(workspaceId?: string) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...initial,
    workspaces: [
      {
        id: 'workspace-a',
        displayName: 'Existing',
        shortCode: 'OLD',
        color: '#123456',
        enabled: true,
        isolation: 'strict',
        storageLimitGiB: 42,
        localCiEnabled: true,
        automaticDeliveryGroupingEnabled: true,
      },
    ],
    activeViewScope: { ...initial.activeViewScope, workspaceIds: ['workspace-a'] },
  });
  const context: IWorkspaceSettingsContext = {
    settings,
    configurationBusy: signal(false),
    editorBusy: signal(false),
    storageStatus: signal(undefined),
  };
  const close = vi.fn();
  const saveSettings = vi.fn<IWorkspaceConfiguration['saveSettings']>(async () => true);
  TestBed.configureTestingModule({
    providers: [
      WorkspaceSettingsEditorViewPresenter,
      { provide: WORKSPACE_SETTINGS_CONTEXT, useValue: context },
      { provide: WORKSPACE_CONFIGURATION, useValue: { saveSettings } },
      { provide: DRAWER_REF_DATA, useValue: { kind: 'workspace', workspaceId } },
      { provide: DRAWER_REF, useValue: { close } },
    ],
  });
  return {
    presenter: TestBed.inject(WorkspaceSettingsEditorViewPresenter),
    settings,
    close,
    saveSettings,
  };
}

describe('WorkspaceSettingsEditorViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('renames a workspace without resetting its other feature settings or active scope', async () => {
    // arrange
    const { presenter, saveSettings, close } = arrange('workspace-a');
    presenter.workspace.displayName = ' Renamed ';
    presenter.workspace.shortCode = 'longshortcode';

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    const saved = saveSettings.mock.calls[0]?.[0];
    expect(saved?.workspaces[0]).toMatchObject({
      id: 'workspace-a',
      displayName: 'Renamed',
      shortCode: 'LONGSHOR',
      storageLimitGiB: 42,
      localCiEnabled: true,
      automaticDeliveryGroupingEnabled: true,
    });
    expect(saved?.activeViewScope.workspaceIds).toEqual(['workspace-a']);
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not persist invalid required fields or close the draft', () => {
    // arrange
    const { presenter, saveSettings, close } = arrange();
    presenter.workspace.displayName = 'New';
    presenter.workspace.shortCode = 'NEW';
    presenter.workspace.color = 'invalid';

    // act
    presenter.saveCommand.execute();

    // assert
    expect(saveSettings).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(presenter.busy()).toBe(false);
  });

  it('prevents a second save while persistence is pending and retains the drawer after rejection', async () => {
    // arrange
    const { presenter, saveSettings, close } = arrange('workspace-a');
    let finish: (saved: boolean) => void = () => {
      throw new Error('Save was not started.');
    };
    saveSettings.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );

    // act
    presenter.saveCommand.execute();
    presenter.saveCommand.execute();
    finish(false);
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });
});
